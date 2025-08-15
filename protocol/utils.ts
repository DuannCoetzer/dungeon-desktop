/**
 * Utility functions for the protocol layer.
 * 
 * These helper functions provide common functionality needed by the protocol
 * functions while maintaining pure function principles.
 */

/**
 * Generates a unique identifier string.
 * Uses a simple timestamp + random number approach for uniqueness.
 * 
 * @returns A unique identifier string
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Creates a deep clone of an object.
 * This ensures that modifications to the cloned object don't affect the original.
 * 
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cloneDeep(item)) as T;
  }

  if (typeof obj === 'object') {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = cloneDeep((obj as any)[key]);
      }
    }
    return clonedObj as T;
  }

  return obj;
}

/**
 * Checks if two objects are deeply equal.
 * Useful for comparing map states or detecting changes.
 * 
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns True if objects are deeply equal, false otherwise
 */
export function deepEqual<T>(obj1: T, obj2: T): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  if (Array.isArray(obj1)) {
    const arr1 = obj1 as unknown as any[];
    const arr2 = obj2 as unknown as any[];
    
    if (arr1.length !== arr2.length) {
      return false;
    }

    for (let i = 0; i < arr1.length; i++) {
      if (!deepEqual(arr1[i], arr2[i])) {
        return false;
      }
    }

    return true;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    if (!deepEqual((obj1 as any)[key], (obj2 as any)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Merges two objects, with properties from the second object taking precedence.
 * Creates a new object without modifying the originals.
 * 
 * @param obj1 - Base object
 * @param obj2 - Object with properties to merge (takes precedence)
 * @returns A new merged object
 */
export function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

/**
 * Safely gets a nested property from an object using a dot-notation path.
 * Returns undefined if the path doesn't exist.
 * 
 * @param obj - The object to get the property from
 * @param path - Dot-notation path to the property (e.g., 'a.b.c')
 * @param defaultValue - Value to return if property doesn't exist
 * @returns The property value or the default value
 */
export function getNestedProperty<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

/**
 * Safely sets a nested property in an object using a dot-notation path.
 * Creates a new object without modifying the original.
 * 
 * @param obj - The object to set the property in
 * @param path - Dot-notation path to the property (e.g., 'a.b.c')
 * @param value - The value to set
 * @returns A new object with the property set
 */
export function setNestedProperty<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const result = cloneDeep(obj);
  let current = result as any;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Clamps a number between a minimum and maximum value.
 * 
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Checks if a value is within a given range (inclusive).
 * 
 * @param value - The value to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range, false otherwise
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Calculates the distance between two points.
 * 
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns The Euclidean distance between the points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the Manhattan distance between two points.
 * 
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns The Manhattan distance between the points
 */
export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}
