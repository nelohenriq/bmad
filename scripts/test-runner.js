#!/usr/bin/env node

/**
 * Test Runner with Error Collection
 * Runs tests and collects all errors for systematic fixing
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.errors = []
    this.currentTest = null
    this.errorSummary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errorCategories: {}
    }
  }

  async runTests() {
    console.log('🚀 Starting comprehensive test run...\n')

    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['test', '--', '--verbose', '--no-coverage'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['inherit', 'pipe', 'pipe']
      })

      let output = ''

      testProcess.stdout.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        process.stdout.write(chunk)
      })

      testProcess.stderr.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        process.stderr.write(chunk)
      })

      testProcess.on('close', (code) => {
        this.parseOutput(output)
        this.generateReport()

        if (code === 0) {
          console.log('\n✅ All tests passed!')
          resolve()
        } else {
          console.log(`\n❌ Tests completed with ${this.errorSummary.failedTests} failures`)
          this.showNextSteps()
          resolve() // Don't reject, just show the results
        }
      })

      testProcess.on('error', (error) => {
        console.error('Failed to run tests:', error)
        reject(error)
      })
    })
  }

  parseOutput(output) {
    const lines = output.split('\n')
    let inErrorBlock = false
    let currentError = []

    for (const line of lines) {
      // Test summary line
      const summaryMatch = line.match(/Tests:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/)
      if (summaryMatch) {
        this.errorSummary.failedTests = parseInt(summaryMatch[1])
        this.errorSummary.passedTests = parseInt(summaryMatch[2])
        this.errorSummary.totalTests = parseInt(summaryMatch[3])
        continue
      }

      // Test suite summary
      const suiteMatch = line.match(/Test Suites:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/)
      if (suiteMatch) {
        this.errorSummary.failedSuites = parseInt(suiteMatch[1])
        this.errorSummary.passedSuites = parseInt(suiteMatch[2])
        this.errorSummary.totalSuites = parseInt(suiteMatch[3])
        continue
      }

      // Detect test failure start
      if (line.includes('FAIL') && line.includes('.test.')) {
        if (currentError.length > 0) {
          this.errors.push({
            test: this.currentTest,
            error: currentError.join('\n')
          })
        }
        this.currentTest = line.trim()
        currentError = []
        inErrorBlock = true
        continue
      }

      // Collect error details
      if (inErrorBlock) {
        if (line.includes('PASS') && line.includes('.test.')) {
          // Next test started, save previous error
          if (currentError.length > 0) {
            this.errors.push({
              test: this.currentTest,
              error: currentError.join('\n')
            })
          }
          inErrorBlock = false
          currentError = []
        } else if (line.trim() && !line.includes('console.log') && !line.includes('at ')) {
          currentError.push(line)
        }
      }
    }

    // Add last error if exists
    if (currentError.length > 0) {
      this.errors.push({
        test: this.currentTest,
        error: currentError.join('\n')
      })
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary')
    console.log('='.repeat(50))
    console.log(`Total Tests: ${this.errorSummary.totalTests}`)
    console.log(`Passed: ${this.errorSummary.passedTests}`)
    console.log(`Failed: ${this.errorSummary.failedTests}`)
    console.log(`Success Rate: ${((this.errorSummary.passedTests / this.errorSummary.totalTests) * 100).toFixed(1)}%`)

    if (this.errors.length > 0) {
      console.log('\n🔍 Detailed Error Analysis')
      console.log('='.repeat(50))

      // Categorize errors
      const errorCategories = {}

      for (const error of this.errors) {
        const errorText = error.error.toLowerCase()

        let category = 'Other'

        if (errorText.includes('cannot find module') || errorText.includes('cannot find name')) {
          category = 'Missing Imports'
        } else if (errorText.includes('does not exist')) {
          category = 'Missing Properties'
        } else if (errorText.includes('is not assignable')) {
          category = 'Type Errors'
        } else if (errorText.includes('jest.mock') || errorText.includes('mock')) {
          category = 'Mock Issues'
        } else if (errorText.includes('act(') || errorText.includes('async')) {
          category = 'Async Issues'
        }

        if (!errorCategories[category]) {
          errorCategories[category] = []
        }
        errorCategories[category].push(error)
      }

      // Display categorized errors
      Object.entries(errorCategories).forEach(([category, errors]) => {
        console.log(`\n${category} (${errors.length} errors):`)
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.test}`)
        })
      })

      // Save detailed report
      this.saveDetailedReport(errorCategories)
    }
  }

  saveDetailedReport(errorCategories) {
    const reportPath = path.join(__dirname, '..', 'test-report.json')

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.errorSummary,
      errors: this.errors,
      categories: errorCategories,
      recommendations: this.generateRecommendations(errorCategories)
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: test-report.json`)
  }

  generateRecommendations(errorCategories) {
    const recommendations = []

    if (errorCategories['Missing Imports']) {
      recommendations.push({
        category: 'Missing Imports',
        action: 'Run: npm run test:fix',
        description: 'Automatically add missing import statements'
      })
    }

    if (errorCategories['Type Errors']) {
      recommendations.push({
        category: 'Type Errors',
        action: 'Manual review required',
        description: 'Check component prop types and interfaces'
      })
    }

    if (errorCategories['Mock Issues']) {
      recommendations.push({
        category: 'Mock Issues',
        action: 'Add mock setup',
        description: 'Configure proper mocks for external dependencies'
      })
    }

    if (errorCategories['Async Issues']) {
      recommendations.push({
        category: 'Async Issues',
        action: 'Use act() wrapper',
        description: 'Wrap state updates in act() for React Testing Library'
      })
    }

    return recommendations
  }

  showNextSteps() {
    console.log('\n🚀 Next Steps to Fix Tests:')
    console.log('='.repeat(50))

    if (this.errors.some(e => e.error.toLowerCase().includes('cannot find'))) {
      console.log('1. 🔧 Run automated fixes:')
      console.log('   npm run test:fix')
      console.log('')
    }

    console.log('2. 📊 Run diagnostics:')
    console.log('   npm run test:diagnostics')
    console.log('')

    console.log('3. 🔄 Fix and re-run:')
    console.log('   npm run test:fix-and-run')
    console.log('')

    console.log('4. 📖 Check detailed report:')
    console.log('   cat test-report.json')
    console.log('')

    console.log('5. 🧪 Run specific test categories:')
    console.log('   npm test -- --testPathPattern=components  # Component tests')
    console.log('   npm test -- --testPathPattern=hooks       # Hook tests')
    console.log('   npm test -- --testPathPattern=a11y        # Accessibility tests')
  }
}

// CLI interface
if (require.main === module) {
  const runner = new TestRunner()
  runner.runTests().catch(error => {
    console.error('💥 Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = TestRunner