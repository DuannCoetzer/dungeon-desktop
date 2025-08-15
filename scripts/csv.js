/*
 Utility CSV module without external deps.
 - Reads CSV into array of objects (preserves row order)
 - Writes updated rows, preserving original column order and appending new columns
 - Provides a convenience function to transform rows and write out

 Supports common CSV features:
 - Commas as separators
 - Quoted fields with escaped quotes using ""
 - Newlines within quoted fields
*/

const fs = require('fs');

/**
 * Parse CSV text into header array and row arrays.
 * Handles quoted fields and embedded newlines.
 * @param {string} text
 * @returns {{ headers: string[], records: string[][] }}
 */
function parseCsv(text) {
  const headers = [];
  const records = [];

  // State machine
  const COMMA = ',';
  const CR = '\r';
  const LF = '\n';
  const QUOTE = '"';

  let i = 0;
  const len = text.length;

  /** @type {string[]} */
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;
  let fieldStarted = false;

  function endField() {
    currentRecord.push(currentField);
    currentField = '';
    fieldStarted = false;
  }
  function endRecord() {
    // If line empty and last record empty, ignore trailing newline
    // Push even if empty to preserve structure
    records.push(currentRecord);
    currentRecord = [];
  }

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === QUOTE) {
        // Lookahead for escaped quote
        const next = text[i + 1];
        if (next === QUOTE) {
          currentField += QUOTE;
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i += 1;
          continue;
        }
      } else {
        currentField += ch;
        i += 1;
        continue;
      }
    } else {
      if (ch === QUOTE) {
        inQuotes = true;
        fieldStarted = true;
        i += 1;
        continue;
      }
      if (ch === COMMA) {
        endField();
        i += 1;
        continue;
      }
      if (ch === CR) {
        // normalize CRLF to LF
        // finalize field and record
        endField();
        // consume optional LF
        if (text[i + 1] === LF) i += 1;
        endRecord();
        i += 1;
        continue;
      }
      if (ch === LF) {
        endField();
        endRecord();
        i += 1;
        continue;
      }
      // regular char
      currentField += ch;
      fieldStarted = true;
      i += 1;
      continue;
    }
  }
  // End of input
  // If we're in quotes at EOF, close field implicitly
  if (inQuotes) {
    // Treat as end of field
    inQuotes = false;
  }
  // If any field content or we started a field, finalize
  if (fieldStarted || currentField.length > 0 || currentRecord.length > 0) {
    endField();
    endRecord();
  }

  if (records.length === 0) {
    return { headers: [], records: [] };
  }

  const headerRow = records.shift();
  for (const h of headerRow) headers.push(h);

  return { headers, records };
}

/**
 * Convert array of objects to CSV text given ordered headers.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} headers
 * @param {{ eol?: string }} [options]
 */
function toCsv(rows, headers, options = {}) {
  const eol = options.eol ?? '\n';
  const out = [];
  out.push(headers.map(escapeCsv).join(','));
  for (const row of rows) {
    const fields = headers.map(h => escapeCsv(valueOrEmpty(row[h])));
    out.push(fields.join(','));
  }
  return out.join(eol) + eol; // trailing newline
}

/**
 * Escape a field according to RFC 4180
 * - If contains comma, quote, or newline, wrap in quotes and escape quotes
 * @param {any} value
 */
function escapeCsv(value) {
  const s = String(value ?? '');
  if (s === '') return '';
  const needsQuotes = /[",\n\r]/.test(s);
  if (!needsQuotes) return s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function valueOrEmpty(v) {
  if (v === undefined || v === null) return '';
  return v;
}

/**
 * Read CSV file and return headers and row objects in original order.
 * @param {string} filePath
 * @param {{ encoding?: BufferEncoding }} [options]
 * @returns {{ headers: string[], rows: Array<Record<string, string>> }}
 */
function readCsv(filePath, options = {}) {
  const enc = options.encoding ?? 'utf8';
  const text = fs.readFileSync(filePath, enc);
  const { headers, records } = parseCsv(text);
  const rows = records.map(rec => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = rec[i] ?? '';
    }
    return obj;
  });
  return { headers, rows };
}

/**
 * Writes rows to CSV, preserving original header order and appending new columns.
 * - If headers option provided, uses it as the original order base.
 * - New columns (keys present in rows but not in headers) are appended in encountered order.
 * @param {string} filePath
 * @param {Array<Record<string, any>>} rows
 * @param {{ headers?: string[], eol?: string }} [options]
 */
function writeCsv(filePath, rows, options = {}) {
  const baseHeaders = options.headers ?? inferHeadersFromRows(rows);
  const allHeaders = appendNewHeaders(baseHeaders, rows);
  const csv = toCsv(rows, allHeaders, { eol: options.eol });
  fs.writeFileSync(filePath, csv, 'utf8');
  return allHeaders;
}

/**
 * Convenience: read, transform rows, and write back to another file.
 * The updater may mutate and/or return a new object. If it returns undefined, the original (possibly mutated) row is used.
 * @param {string} inPath
 * @param {string} outPath
 * @param {(row: Record<string, any>, index: number) => Record<string, any> | void} updater
 * @param {{ eol?: string }} [options]
 * @returns {{ headers: string[] }} headers used for output
 */
function mapRowsAndWrite(inPath, outPath, updater, options = {}) {
  const { headers, rows } = readCsv(inPath);
  const updated = rows.map((row, idx) => {
    const res = updater(row, idx);
    return res === undefined ? row : res;
  });
  const outHeaders = writeCsv(outPath, updated, { headers, eol: options.eol });
  return { headers: outHeaders };
}

/**
 * Infer base headers from rows if none provided.
 * Uses the keys from the first row (stable Object.keys order) as base.
 * @param {Array<Record<string, any>>} rows
 */
function inferHeadersFromRows(rows) {
  if (!rows || rows.length === 0) return [];
  return Object.keys(rows[0]);
}

/**
 * Append any keys found in rows that are not already in baseHeaders, preserving encounter order.
 * @param {string[]} baseHeaders
 * @param {Array<Record<string, any>>} rows
 */
function appendNewHeaders(baseHeaders, rows) {
  const set = new Set(baseHeaders);
  const result = baseHeaders.slice();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!set.has(key)) {
        set.add(key);
        result.push(key);
      }
    }
  }
  return result;
}

module.exports = {
  parseCsv,
  readCsv,
  writeCsv,
  mapRowsAndWrite,
  toCsv,
};

