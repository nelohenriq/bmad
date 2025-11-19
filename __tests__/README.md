# Test Suite Documentation

This directory contains comprehensive tests for the Neural Feed Studio application, along with automated tools to diagnose and fix test failures.

## Test Structure

```
__tests__/
├── components/           # Component tests
│   ├── ui/              # UI component tests
│   └── *.a11y.test.tsx  # Accessibility tests
├── lib/                 # Library/utility tests
│   └── hooks/          # Custom hook tests
├── *.perf.test.tsx      # Performance tests
└── README.md           # This file
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- __tests__/components/ContentEditor.test.tsx

# Run accessibility tests only
npm test -- --testPathPattern=a11y

# Run performance tests only
npm test -- --testPathPattern=perf
```

### Automated Test Diagnostics

When tests fail, use the automated diagnostic tools to identify and fix issues:

```bash
# Run diagnostics to analyze test failures
npm run test:diagnostics

# Automatically fix common test issues
npm run test:fix

# Fix issues and run tests again
npm run test:fix-and-run
```

## Test Categories

### 1. Unit Tests
- Component rendering and behavior
- Hook functionality
- Utility functions
- Error handling

### 2. Integration Tests
- Component interactions
- API integrations
- State management

### 3. Accessibility Tests
- ARIA attributes validation
- Keyboard navigation
- Screen reader compatibility
- Focus management

### 4. Performance Tests
- Lazy loading verification
- Bundle size optimization
- Rendering performance

## Common Test Issues & Fixes

### Missing Imports
**Error**: `Cannot find name 'ComponentName'`

**Fix**: The test fixer will automatically add missing imports:
```javascript
// Added automatically
import { ComponentName } from '@/components/ui/component-name'
```

### Missing Props
**Error**: `Property 'propName' does not exist`

**Fix**: Manual review required. Check component interface and add missing props.

### Type Errors
**Error**: `Type 'X' is not assignable to type 'Y'`

**Fix**: Manual review required. Update type definitions or component props.

### Mock Errors
**Error**: `jest.mock() not found`

**Fix**: Add proper mock setup at the top of test files:
```javascript
// Mock setup
jest.mock('@/lib/api', () => ({
  apiCall: jest.fn()
}))
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Uses SWC for fast compilation
- jsdom environment for DOM testing
- Module name mapping for path aliases
- Coverage collection configured

### Test Setup (`jest.setup.js`)
- React Testing Library configuration
- Custom matchers from jest-dom
- Next.js specific mocks

## Writing New Tests

### Component Test Template
```typescript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interactions', () => {
    render(<ComponentName />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Updated Text')).toBeInTheDocument()
  })
})
```

### Hook Test Template
```typescript
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from '@/lib/hooks/useCustomHook'

describe('useCustomHook', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useCustomHook('initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('updates value', () => {
    const { result } = renderHook(() => useCustomHook('initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
  })
})
```

### Accessibility Test Template
```typescript
describe('ComponentName Accessibility', () => {
  it('has proper ARIA attributes', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label')
  })

  it('supports keyboard navigation', () => {
    render(<ComponentName />)
    const element = screen.getByRole('button')

    fireEvent.keyDown(element, { key: 'Enter' })
    expect(element).toHaveFocus()
  })
})
```

## Test Coverage Goals

- **Components**: >80% coverage
- **Hooks**: >90% coverage
- **Utilities**: >85% coverage
- **Accessibility**: 100% of interactive elements

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Main branch pushes
- Release builds

### CI Commands
```bash
# Full test suite with coverage
npm test -- --coverage --watchAll=false

# Accessibility audit
npm test -- --testPathPattern=a11y

# Performance tests
npm test -- --testPathPattern=perf
```

## Troubleshooting

### Tests Not Running
1. Check Jest configuration
2. Verify dependencies are installed
3. Clear Jest cache: `npx jest --clearCache`

### Import Errors
1. Run `npm run test:fix` to auto-fix imports
2. Check path aliases in `jest.config.js`
3. Verify file paths exist

### Async Test Timeouts
1. Increase timeout in test: `jest.setTimeout(10000)`
2. Use `waitFor` for async operations
3. Mock async operations properly

### Coverage Issues
1. Add coverage ignore comments for generated code
2. Update coverage thresholds in `jest.config.js`
3. Exclude test utilities from coverage

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Include accessibility tests
3. Update this documentation
4. Run full test suite before submitting PR

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Accessibility](https://testing-library.com/docs/dom-testing-library/api-accessibility/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)