import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/lib/hooks/useDebounce'

describe('useDebounce', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Initial value
    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'changed', delay: 500 })
    expect(result.current).toBe('initial') // Should still be old value

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('changed') // Should now be new value
  })

  it('resets timer on value change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change value
    rerender({ value: 'first-change', delay: 500 })

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Change value again before debounce completes
    rerender({ value: 'second-change', delay: 500 })

    // Advance time to complete the full delay from the second change
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('second-change')
  })

  it('works with different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )

    rerender({ value: 'changed', delay: 1000 })

    // Advance time by 500ms - should still be initial
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    // Advance remaining time
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('changed')
  })

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )

    rerender({ value: 'changed', delay: 0 })

    // With zero delay, should update immediately
    expect(result.current).toBe('changed')
  })

  it('works with complex objects', () => {
    const initialObj = { id: 1, name: 'initial' }
    const changedObj = { id: 2, name: 'changed' }

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 300 } }
    )

    expect(result.current).toBe(initialObj)

    rerender({ value: changedObj, delay: 300 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toBe(changedObj)
  })
})