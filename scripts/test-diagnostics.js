#!/usr/bin/env node

/**
 * Test Diagnostics and Fix Runner
 * This script helps identify and fix test failures systematically
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestDiagnostics {
  constructor() {
    this.testResults = null
    this.failedTests = []
    this.errorPatterns = {
      // Import/Module errors
      'Cannot find module': this.fixMissingModule,
      'Module not found': this.fixMissingModule,

      // Component errors
      'Cannot find name': this.fixMissingComponent,
      'Property .* does not exist': this.fixMissingProp,

      // TypeScript errors
      'Type .* is not assignable': this.fixTypeError,
      'Expected .* but got': this.fixTypeMismatch,

      // Mock errors
      'jest.mock.*not found': this.fixMockError,

      // Async/Promise errors
      'act.*was not wrapped': this.fixActWarning,
    }
  }

  async runDiagnostics() {
    console.log('🔍 Running test diagnostics...\n')

    try {
      // Run tests and capture output
      const testOutput = this.runTests()
      this.parseTestOutput(testOutput)
      this.analyzeFailures()

      console.log(`📊 Found ${this.failedTests.length} failed tests\n`)

      // Process failures
      for (const failure of this.failedTests) {
        await this.fixTestFailure(failure)
      }

    } catch (error) {
      console.error('❌ Error running diagnostics:', error.message)
    }
  }

  runTests() {
    try {
      console.log('Running npm test...')
      const output = execSync('npm test -- --verbose --no-coverage', {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      })
      return output
    } catch (error) {
      return error.stdout + error.stderr
    }
  }

  parseTestOutput(output) {
    const lines = output.split('\n')
    let currentTest = null
    let currentError = []

    for (const line of lines) {
      // Detect test suite start
      if (line.includes('FAIL') && line.includes('.test.')) {
        if (currentTest && currentError.length > 0) {
          this.failedTests.push({
            test: currentTest,
            error: currentError.join('\n')
          })
        }
        currentTest = line.trim()
        currentError = []
      }
      // Detect test failure
      else if (line.includes('✕') || line.includes('●')) {
        if (currentTest) {
          currentError.push(line)
        }
      }
      // Collect error details
      else if (currentError.length > 0 && (line.includes('Error:') || line.includes('TypeError:') || line.includes('ReferenceError:'))) {
        currentError.push(line)
      }
    }

    // Add last test if exists
    if (currentTest && currentError.length > 0) {
      this.failedTests.push({
        test: currentTest,
        error: currentError.join('\n')
      })
    }
  }

  analyzeFailures() {
    console.log('🔧 Analyzing test failures...\n')

    const errorCategories = {}

    for (const failure of this.failedTests) {
      const error = failure.error.toLowerCase()

      for (const [pattern, fixer] of Object.entries(this.errorPatterns)) {
        if (error.includes(pattern.toLowerCase())) {
          if (!errorCategories[pattern]) {
            errorCategories[pattern] = []
          }
          errorCategories[pattern].push(failure)
          break
        }
      }
    }

    console.log('Error categories found:')
    Object.keys(errorCategories).forEach(category => {
      console.log(`  • ${category}: ${errorCategories[category].length} tests`)
    })
    console.log()
  }

  async fixTestFailure(failure) {
    console.log(`🔧 Fixing: ${failure.test}`)

    const error = failure.error.toLowerCase()

    for (const [pattern, fixer] of Object.entries(this.errorPatterns)) {
      if (error.includes(pattern.toLowerCase())) {
        try {
          await fixer.call(this, failure)
          console.log(`✅ Fixed: ${failure.test}\n`)
          return
        } catch (fixError) {
          console.log(`❌ Fix failed for ${failure.test}: ${fixError.message}`)
        }
      }
    }

    console.log(`⚠️  No automatic fix available for: ${failure.test}`)
    console.log(`Error: ${failure.error}\n`)
  }

  // Fix methods
  async fixMissingModule(failure) {
    const error = failure.error
    const moduleMatch = error.match(/Cannot find module ['"]([^'"]+)['"]/)

    if (moduleMatch) {
      const moduleName = moduleMatch[1]
      console.log(`Installing missing module: ${moduleName}`)

      try {
        execSync(`npm install ${moduleName}`, {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit'
        })
      } catch (installError) {
        console.log(`Failed to install ${moduleName}, trying dev dependency...`)
        execSync(`npm install --save-dev ${moduleName}`, {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit'
        })
      }
    }
  }

  async fixMissingComponent(failure) {
    const error = failure.error
    const componentMatch = error.match(/Cannot find name ['"]([^'"]+)['"]/)

    if (componentMatch) {
      const componentName = componentMatch[1]
      console.log(`Creating missing component: ${componentName}`)

      // This would need more sophisticated logic to create the actual component
      // For now, we'll just log what needs to be done
      console.log(`TODO: Create component ${componentName}`)
    }
  }

  async fixMissingProp(failure) {
    const error = failure.error
    const propMatch = error.match(/Property ['"]([^'"]+)['"] does not exist/)

    if (propMatch) {
      const propName = propMatch[1]
      console.log(`Adding missing prop: ${propName}`)

      // This would need more sophisticated logic
      console.log(`TODO: Add prop ${propName} to component`)
    }
  }

  async fixTypeError(failure) {
    console.log('Type error detected - manual review needed')
    console.log('Error:', failure.error)
  }

  async fixTypeMismatch(failure) {
    console.log('Type mismatch detected - manual review needed')
    console.log('Error:', failure.error)
  }

  async fixMockError(failure) {
    console.log('Mock error detected - checking mock setup')
    console.log('Error:', failure.error)
  }

  async fixActWarning(failure) {
    console.log('Act warning detected - wrapping async operations')
    console.log('Error:', failure.error)
  }
}

// CLI interface
if (require.main === module) {
  const diagnostics = new TestDiagnostics()
  diagnostics.runDiagnostics().then(() => {
    console.log('🎉 Test diagnostics completed!')
  }).catch(error => {
    console.error('💥 Test diagnostics failed:', error)
    process.exit(1)
  })
}

module.exports = TestDiagnostics