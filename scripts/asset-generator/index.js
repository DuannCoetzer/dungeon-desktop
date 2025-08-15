// Load environment variables as early as possible
import 'dotenv/config'

import fs from 'fs-extra'
import OpenAI from 'openai'

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY in .env. Please set it and retry.')
    process.exit(1)
  }

  const model = process.env.MODEL || 'gpt-4o-mini'
  const temperature = Number(process.env.TEMPERATURE ?? 0.2)
  const maxTokens = Number(process.env.MAX_TOKENS ?? 1024)
  const baseURL = process.env.OPENAI_BASE_URL

  const client = new OpenAI({ apiKey, baseURL })

  // Example usage to verify envs are loaded; adjust to your real logic
  console.log('Configured model:', { model, temperature, maxTokens, baseURL })

  // TODO: replace with actual asset generation logic
  await fs.ensureDir('./out')
  await fs.writeFile('./out/.env_loaded', `model=${model}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

