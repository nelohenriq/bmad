import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  it('returns initial value when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    expect(result.current[0]).toBe('default-value')
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
  })

  it('returns stored value when localStorage has data', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify('stored-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    expect(result.current[0]).toBe('stored-value')
  })

  it('handles JSON parsing errors gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    expect(result.current[0]).toBe('default-value')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('updates localStorage when setValue is called', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'))
  })

  it('handles setValue with function updater', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify('old-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    act(() => {
      result.current[1]((prev) => prev + '-updated')
    })

    expect(result.current[0]).toBe('old-value-updated')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('old-value-updated'))
  })

  it('handles localStorage setItem errors gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})