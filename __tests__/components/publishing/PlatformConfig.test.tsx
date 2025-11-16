import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlatformConfig } from '@/components/publishing/PlatformConfig'

// Mock fetch
global.fetch = jest.fn()

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ options, onChange, placeholder, value }: any) => (
    <select
      value={value}
      onChange={(e) => onChange && onChange(e)}
      data-testid="platform-select"
    >
      <option value="">{placeholder}</option>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} />,
}))

describe('PlatformConfig', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('New Platform Form', () => {
    it('should render form for new platform', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(screen.getByText('Add Platform')).toBeInTheDocument()
      expect(screen.getByDisplayValue('wordpress')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Add Platform')).toBeInTheDocument()
    })

    it('should show WordPress configuration fields by default', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(screen.getByPlaceholderText('https://yoursite.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('')).toBeInTheDocument() // Username field
      expect(screen.getByDisplayValue('')).toBeInTheDocument() // Password field
    })

    it('should switch to Medium configuration fields', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const select = screen.getByDisplayValue('wordpress')
      fireEvent.change(select, { target: { value: 'medium' } })

      expect(screen.getByPlaceholderText('Your Medium API key')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('https://yoursite.com')).not.toBeInTheDocument()
    })

    it('should switch to Blogger configuration fields', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const select = screen.getByDisplayValue('wordpress')
      fireEvent.change(select, { target: { value: 'blogger' } })

      expect(screen.getByText('Blog ID')).toBeInTheDocument()
      expect(screen.getByText('API Key')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('https://yoursite.com')).not.toBeInTheDocument()
    })

    it('should submit form with WordPress data', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Fill out the form
      const nameInput = screen.getByDisplayValue('')
      const urlInput = screen.getByPlaceholderText('https://yoursite.com')
      const usernameInput = screen.getAllByDisplayValue('')[1] // Second empty input
      const passwordInput = screen.getAllByDisplayValue('')[2] // Third empty input

      fireEvent.change(nameInput, { target: { value: 'My WordPress Blog' } })
      fireEvent.change(urlInput, { target: { value: 'https://myblog.com' } })
      fireEvent.change(usernameInput, { target: { value: 'admin' } })
      fireEvent.change(passwordInput, { target: { value: 'secret123' } })

      const submitButton = screen.getByText('Add Platform')
      fireEvent.click(submitButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'My WordPress Blog',
        platform: 'wordpress',
        credentials: {
          apiKey: '',
          username: 'admin',
          password: 'secret123',
          siteUrl: 'https://myblog.com',
          blogId: ''
        },
        settings: {
          defaultTags: [],
          defaultCategory: 'General',
          publishImmediately: true,
          format: 'html'
        },
        isActive: true
      })
    })

    it('should submit form with Medium data', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Switch to Medium
      const select = screen.getByDisplayValue('wordpress')
      fireEvent.change(select, { target: { value: 'medium' } })

      // Fill out the form
      const nameInput = screen.getByDisplayValue('')
      const apiKeyInput = screen.getByPlaceholderText('Your Medium API key')

      fireEvent.change(nameInput, { target: { value: 'My Medium Account' } })
      fireEvent.change(apiKeyInput, { target: { value: 'medium-api-key-123' } })

      const submitButton = screen.getByText('Add Platform')
      fireEvent.click(submitButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'My Medium Account',
        platform: 'medium',
        credentials: {
          apiKey: 'medium-api-key-123',
          username: '',
          password: '',
          siteUrl: '',
          blogId: ''
        },
        settings: {
          defaultTags: [],
          defaultCategory: 'General',
          publishImmediately: true,
          format: 'html'
        },
        isActive: true
      })
    })

    it('should call onCancel when cancel button is clicked', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Edit Platform Form', () => {
    const existingPlatform = {
      id: 'platform-1',
      name: 'Existing WordPress Blog',
      platform: 'wordpress' as const,
      credentials: {
        apiKey: '',
        username: 'existinguser',
        password: 'existingpass',
        siteUrl: 'https://existing.com',
        blogId: ''
      },
      settings: {
        defaultTags: ['tech', 'coding'],
        defaultCategory: 'Technology',
        publishImmediately: false,
        format: 'markdown' as const
      },
      isActive: true
    }

    it('should render form with existing platform data', () => {
      render(
        <PlatformConfig
          platform={existingPlatform}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Edit Platform')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing WordPress Blog')).toBeInTheDocument()
      expect(screen.getByDisplayValue('wordpress')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://existing.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('existinguser')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Technology')).toBeInTheDocument()
      expect(screen.getByDisplayValue('markdown')).toBeInTheDocument()
    })

    it('should show existing tags', () => {
      render(
        <PlatformConfig
          platform={existingPlatform}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('tech')).toBeInTheDocument()
      expect(screen.getByDisplayValue('coding')).toBeInTheDocument()
    })

    it('should submit updated platform data', () => {
      render(
        <PlatformConfig
          platform={existingPlatform}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const nameInput = screen.getByDisplayValue('Existing WordPress Blog')
      fireEvent.change(nameInput, { target: { value: 'Updated Blog Name' } })

      const submitButton = screen.getByText('Update Platform')
      fireEvent.click(submitButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        ...existingPlatform,
        name: 'Updated Blog Name'
      })
    })
  })

  describe('Tag Management', () => {
    it('should add new tag', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const addTagButton = screen.getByText('+ Add Tag')
      fireEvent.click(addTagButton)

      expect(screen.getByPlaceholderText('Tag 1')).toBeInTheDocument()
    })

    it('should remove tag', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Add a tag first
      const addTagButton = screen.getByText('+ Add Tag')
      fireEvent.click(addTagButton)

      const tagInput = screen.getByPlaceholderText('Tag 1')
      fireEvent.change(tagInput, { target: { value: 'test-tag' } })

      // Remove the tag
      const removeButton = screen.getByText('Remove')
      fireEvent.click(removeButton)

      expect(screen.queryByDisplayValue('test-tag')).not.toBeInTheDocument()
    })

    it('should update tag value', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Add a tag
      const addTagButton = screen.getByText('+ Add Tag')
      fireEvent.click(addTagButton)

      const tagInput = screen.getByPlaceholderText('Tag 1')
      fireEvent.change(tagInput, { target: { value: 'updated-tag' } })

      expect(screen.getByDisplayValue('updated-tag')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require platform name', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const submitButton = screen.getByText('Add Platform')
      fireEvent.click(submitButton)

      // HTML5 validation should prevent submission without name
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should validate URL format for WordPress site URL', () => {
      render(<PlatformConfig onSave={mockOnSave} onCancel={mockOnCancel} />)

      const nameInput = screen.getByDisplayValue('')
      const urlInput = screen.getByPlaceholderText('https://yoursite.com')

      fireEvent.change(nameInput, { target: { value: 'Test Blog' } })
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } })

      const submitButton = screen.getByText('Add Platform')
      fireEvent.click(submitButton)

      // HTML5 URL validation should prevent submission
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })
})