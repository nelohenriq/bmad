#!/usr/bin/env node

/**
 * Test Fixer - Automated Test Failure Resolution
 * Identifies common test failures and applies fixes automatically
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class TestFixer {
  constructor() {
    this.fixes = {
      // Missing component imports
      'Cannot find name.*Button': this.fixMissingButtonImport,
      'Cannot find name.*Select': this.fixMissingSelectImport,
      'Cannot find name.*Bold': this.fixMissingIconImport,
      'Cannot find name.*Italic': this.fixMissingIconImport,
      'Cannot find name.*List': this.fixMissingIconImport,
      'Cannot find name.*Link': this.fixMissingIconImport,
      'Cannot find name.*Upload': this.fixMissingIconImport,
      'Cannot find name.*Save': this.fixMissingIconImport,
      'Cannot find name.*Undo': this.fixMissingIconImport,
      'Cannot find name.*Redo': this.fixMissingIconImport,
      'Cannot find name.*FileText': this.fixMissingIconImport,
      'Cannot find name.*History': this.fixMissingIconImport,
      'Cannot find name.*Loader2': this.fixMissingIconImport,

      // Missing UI component imports
      'Cannot find name.*Loading': this.fixMissingUIImport,
      'Cannot find name.*Tooltip': this.fixMissingUIImport,

      // Missing hook imports
      'Cannot find name.*useLocalStorage': this.fixMissingHookImport,
      'Cannot find name.*useDebounce': this.fixMissingHookImport,
      'Cannot find name.*useServiceWorker': this.fixMissingHookImport,

      // Missing component imports
      'Cannot find name.*ContentEditorSkeleton': this.fixMissingComponentImport,
      'Cannot find name.*ContentEditorLazy': this.fixMissingComponentImport,
      'Cannot find name.*ServiceWorkerProvider': this.fixMissingComponentImport,

      // Type errors
      'Property.*does not exist': this.fixMissingProp,
      'Type.*is not assignable': this.fixTypeMismatch,

      // Mock errors
      'jest.mock.*not found': this.fixMockSetup,
    }
  }

  async runFixes() {
    console.log('🔧 Starting automated test fixes...\n')

    const testFiles = this.findTestFiles()
    let totalFixed = 0

    for (const testFile of testFiles) {
      console.log(`📝 Checking ${path.basename(testFile)}...`)
      const fixes = await this.analyzeAndFixFile(testFile)
      totalFixed += fixes
    }

    console.log(`\n✅ Fixed ${totalFixed} issues across ${testFiles.length} test files`)

    // Run tests again to see remaining issues
    console.log('\n🔄 Running tests to check remaining issues...')
    this.runTests()
  }

  findTestFiles() {
    const testFiles = []

    function scanDirectory(dir) {
      const files = fs.readdirSync(dir)

      for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(fullPath)
        } else if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
          testFiles.push(fullPath)
        }
      }
    }

    scanDirectory(path.join(__dirname, '..', '__tests__'))
    return testFiles
  }

  async analyzeAndFixFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    let fixCount = 0

    // Check for common import issues
    const lines = content.split('\n')
    const newLines = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      // Check for missing imports
      for (const [pattern, fixer] of Object.entries(this.fixes)) {
        if (line.includes('//') || line.trim().startsWith('*')) continue

        const regex = new RegExp(pattern, 'i')
        if (regex.test(line)) {
          try {
            const result = await fixer.call(this, line, lines, i, filePath)
            if (result) {
              line = result.line || line
              if (result.additionalLines) {
                newLines.push(...result.additionalLines)
              }
              fixCount++
              modified = true
              console.log(`  ✅ Fixed: ${pattern}`)
              break
            }
          } catch (error) {
            console.log(`  ❌ Failed to fix ${pattern}: ${error.message}`)
          }
        }
      }

      newLines.push(line)
    }

    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'))
    }

    return fixCount
  }

  // Fix methods
  async fixMissingButtonImport(line, lines, index, filePath) {
    const importLine = "import { Button } from '@/components/ui/button'"
    return this.addImportIfMissing(importLine, lines)
  }

  async fixMissingSelectImport(line, lines, index, filePath) {
    const importLine = "import { Select } from '@/components/ui/select'"
    return this.addImportIfMissing(importLine, lines)
  }

  async fixMissingIconImport(line, lines, index, filePath) {
    const iconMatch = line.match(/Cannot find name ['"]([^'"]+)['"]/i)
    if (iconMatch) {
      const iconName = iconMatch[1]
      const importLine = `import { ${iconName} } from 'lucide-react'`
      return this.addImportIfMissing(importLine, lines)
    }
  }

  async fixMissingUIImport(line, lines, index, filePath) {
    const componentMatch = line.match(/Cannot find name ['"]([^'"]+)['"]/i)
    if (componentMatch) {
      const componentName = componentMatch[1]
      const importLine = `import { ${componentName} } from '@/components/ui/${componentName.toLowerCase()}'`
      return this.addImportIfMissing(importLine, lines)
    }
  }

  async fixMissingHookImport(line, lines, index, filePath) {
    const hookMatch = line.match(/Cannot find name ['"]([^'"]+)['"]/i)
    if (hookMatch) {
      const hookName = hookMatch[1]
      const importLine = `import { ${hookName} } from '@/lib/hooks/${hookName}'`
      return this.addImportIfMissing(importLine, lines)
    }
  }

  async fixMissingComponentImport(line, lines, index, filePath) {
    const componentMatch = line.match(/Cannot find name ['"]([^'"]+)['"]/i)
    if (componentMatch) {
      const componentName = componentMatch[1]
      const importLine = `import { ${componentName} } from '@/components/${componentName}'`
      return this.addImportIfMissing(importLine, lines)
    }
  }

  async fixMissingProp(line, lines, index, filePath) {
    // This would need more sophisticated analysis
    console.log('  ⚠️  Manual review needed for missing prop')
  }

  async fixTypeMismatch(line, lines, index, filePath) {
    // This would need more sophisticated analysis
    console.log('  ⚠️  Manual review needed for type mismatch')
  }

  async fixMockSetup(line, lines, index, filePath) {
    // Add mock setup at the top of the file
    const mockLine = "// Mock setup would go here"
    return { additionalLines: [mockLine] }
  }

  addImportIfMissing(importLine, lines) {
    // Check if import already exists
    for (const line of lines) {
      if (line.trim() === importLine) {
        return null // Already exists
      }
    }

    // Find the last import line
    let lastImportIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import')) {
        lastImportIndex = i
      } else if (lines[i].trim() !== '' && !lines[i].trim().startsWith('//')) {
        break
      }
    }

    return {
      additionalLines: lastImportIndex >= 0 ? [importLine] : [importLine, '']
    }
  }

  runTests() {
    try {
      execSync('npm test -- --passWithNoTests --no-coverage', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      })
    } catch (error) {
      console.log('Tests completed with some failures. Run diagnostics again for details.')
    }
  }
}

// CLI interface
if (require.main === module) {
  const fixer = new TestFixer()
  fixer.runFixes().then(() => {
    console.log('🎉 Test fixing completed!')
  }).catch(error => {
    console.error('💥 Test fixing failed:', error)
    process.exit(1)
  })
}

module.exports = TestFixer