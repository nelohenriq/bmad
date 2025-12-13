#!/usr/bin/env node

/**
 * Service Health Check Script
 * Checks the status of all external services used by the application
 */

import https from 'https'
import http from 'http'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
let envContent = ''
try {
  envContent = readFileSync(envPath, 'utf8')
} catch (e) {
  // .env file might not exist, continue
}

const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

// Set environment variables
Object.assign(process.env, envVars)

const services = {
  ollama: {
    name: 'Ollama (Local AI)',
    url: 'http://127.0.0.1:11434/api/tags',
    method: 'GET',
    expectedStatus: 200,
    required: false, // Optional for basic functionality
    note: 'Required for AI content generation and analysis'
  },
  qdrant: {
    name: 'Qdrant (Vector Database)',
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    method: 'GET',
    expectedStatus: 200,
    required: true
  },
  postgres: {
    name: 'PostgreSQL',
    url: process.env.DATABASE_URL ? 'Connection string configured' : null,
    method: 'CONFIG_CHECK',
    expectedStatus: 'configured',
    required: true
  },
  tavily: {
    name: 'Tavily Search API',
    url: 'https://api.tavily.com/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'test', max_results: 1 }),
    expectedStatus: 200,
    required: false // Optional, will use fallback if rate limited
  },
  duckduckgo: {
    name: 'DuckDuckGo Search (Free Fallback)',
    url: 'https://api.duckduckgo.com/?q=test&format=json&no_html=1',
    method: 'GET',
    expectedStatus: 200,
    required: false // Free fallback, always available
  },
  exa: {
    name: 'Exa Search API',
    url: 'https://api.exa.ai/search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.EXA_API_KEY
    },
    body: JSON.stringify({ query: 'test', numResults: 1 }),
    expectedStatus: 200,
    required: false
  }
}

async function checkService(serviceName, config) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        name: config.name,
        status: 'TIMEOUT',
        message: `Request timed out after 10 seconds`,
        required: config.required
      })
    }, 10000)

    if (config.method === 'CONFIG_CHECK') {
      clearTimeout(timeout)
      resolve({
        name: config.name,
        status: config.url ? 'OK' : 'MISSING_CONFIG',
        message: config.url || 'Environment variable not set',
        required: config.required
      })
      return
    }

    const url = new URL(config.url)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: config.method,
      headers: config.headers || {}
    }

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      clearTimeout(timeout)
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === config.expectedStatus) {
          resolve({
            name: config.name,
            status: 'OK',
            message: `Status ${res.statusCode}`,
            required: config.required
          })
        } else {
          resolve({
            name: config.name,
            status: 'ERROR',
            message: `Unexpected status ${res.statusCode}: ${data.substring(0, 100)}`,
            required: config.required
          })
        }
      })
    })

    req.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        name: config.name,
        status: 'ERROR',
        message: error.message,
        required: config.required
      })
    })

    if (config.body) {
      req.write(config.body)
    }

    req.end()
  })
}

async function main() {
  console.log('🔍 Neural Feed Studio - Service Health Check')
  console.log('=' .repeat(50))
  console.log()

  const results = []

  for (const [key, config] of Object.entries(services)) {
    process.stdout.write(`Checking ${config.name}... `)
    const result = await checkService(key, config)
    results.push(result)

    const statusIcon = result.status === 'OK' ? '✅' :
                      result.status === 'TIMEOUT' ? '⏱️' :
                      result.status === 'MISSING_CONFIG' ? '⚙️' : '❌'

    console.log(`${statusIcon} ${result.status}`)
    if (result.status !== 'OK') {
      console.log(`   ${result.message}`)
    }
    console.log()
  }

  // Summary
  console.log('📊 Summary')
  console.log('-'.repeat(30))

  const okServices = results.filter(r => r.status === 'OK')
  const errorServices = results.filter(r => r.status !== 'OK')
  const requiredErrors = errorServices.filter(r => r.required)

  console.log(`✅ Working services: ${okServices.length}`)
  console.log(`❌ Problem services: ${errorServices.length}`)

  if (requiredErrors.length > 0) {
    console.log()
    console.log('🚨 Critical Issues (Required services not working):')
    requiredErrors.forEach(service => {
      console.log(`   - ${service.name}: ${service.message}`)
    })
  }

  if (errorServices.length > requiredErrors.length) {
    console.log()
    console.log('⚠️  Optional Issues (Will use fallbacks or reduced functionality):')
    errorServices.filter(s => !s.required).forEach(service => {
      console.log(`   - ${service.name}: ${service.message}`)
    })
  }

  console.log()
  console.log('💡 Recommendations:')
  if (requiredErrors.length > 0) {
    console.log('   - Fix critical issues before running the application')
  }
  if (errorServices.some(s => s.name.includes('Ollama'))) {
    console.log('   - Start Ollama service: ollama serve')
    console.log('   - Pull required models: ollama pull llama3.2:3b')
  }
  if (errorServices.some(s => s.name.includes('Tavily'))) {
    console.log('   - Check TAVILY_API_KEY in .env file')
    console.log('   - Verify API key is valid and has credits')
    console.log('   - System will automatically fallback to DuckDuckGo when rate limited')
  }
  if (errorServices.some(s => s.name.includes('DuckDuckGo'))) {
    console.log('   - DuckDuckGo should always be available as free fallback')
  }
  if (errorServices.some(s => s.name.includes('Qdrant'))) {
    console.log('   - Start Qdrant: docker run -p 6333:6333 qdrant/qdrant')
  }
  if (errorServices.some(s => s.name.includes('PostgreSQL'))) {
    console.log('   - Check DATABASE_URL in .env file')
    console.log('   - Ensure PostgreSQL is running')
  }

  process.exit(requiredErrors.length > 0 ? 1 : 0)
}

main().catch(console.error)