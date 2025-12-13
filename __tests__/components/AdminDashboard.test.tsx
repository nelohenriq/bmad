import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Settings: () => <div data-testid="settings-icon" />,
  Database: () => <div data-testid="database-icon" />,
  Users: () => <div data-testid="users-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  HardDrive: () => <div data-testid="hard-drive-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />
}))

describe('AdminDashboard', () => {
  it('renders loading state initially', () => {
    render(<AdminDashboard />)

    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
  })

  it('renders dashboard with system health after loading', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument() // Active users
  })

  it('displays active alerts when present', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    expect(screen.getByText('Active Alerts (1)')).toBeInTheDocument()
    expect(screen.getByText('Database connection pool near capacity')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    // Click on Configuration tab
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    fireEvent.click(configTab)

    await waitFor(() => {
      expect(screen.getByText('RAG Configuration')).toBeInTheDocument()
    })

    // Click on Database tab
    const databaseTab = screen.getByRole('tab', { name: /database/i })
    fireEvent.click(databaseTab)

    await waitFor(() => {
      expect(screen.getByText('Database Operations')).toBeInTheDocument()
    })

    // Click on Users tab
    const usersTab = screen.getByRole('tab', { name: /users/i })
    fireEvent.click(usersTab)

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })

    // Click on Audit tab
    const auditTab = screen.getByRole('tab', { name: /audit/i })
    fireEvent.click(auditTab)

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument()
    })

    // Click on Backup tab
    const backupTab = screen.getByRole('tab', { name: /backup/i })
    fireEvent.click(backupTab)

    await waitFor(() => {
      expect(screen.getByText('Backup Operations')).toBeInTheDocument()
    })
  })

  it('displays system resources in overview tab', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    expect(screen.getByText('System Resources')).toBeInTheDocument()
    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
    expect(screen.getByText('Memory Usage')).toBeInTheDocument()
    expect(screen.getByText('DB Connections')).toBeInTheDocument()
  })

  it('shows configuration form in config tab', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    const configTab = screen.getByRole('tab', { name: /configuration/i })
    fireEvent.click(configTab)

    await waitFor(() => {
      expect(screen.getByText('RAG Configuration')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument() // Max tokens
      expect(screen.getByDisplayValue('0.7')).toBeInTheDocument() // Temperature
      expect(screen.getByDisplayValue('10')).toBeInTheDocument() // Top K
      expect(screen.getByDisplayValue('0.8')).toBeInTheDocument() // Similarity threshold
    })
  })

  it('displays user management interface', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    const usersTab = screen.getByRole('tab', { name: /users/i })
    fireEvent.click(usersTab)

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Total Users: 156')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('Administrator')).toBeInTheDocument()
    })
  })

  it('shows audit trail entries', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    const auditTab = screen.getByRole('tab', { name: /audit/i })
    fireEvent.click(auditTab)

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument()
      expect(screen.getByText('Configuration Updated')).toBeInTheDocument()
      expect(screen.getByText('User Login')).toBeInTheDocument()
      expect(screen.getByText('Database Backup')).toBeInTheDocument()
    })
  })

  it('displays backup and recovery options', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    const backupTab = screen.getByRole('tab', { name: /backup/i })
    fireEvent.click(backupTab)

    await waitFor(() => {
      expect(screen.getByText('Backup Operations')).toBeInTheDocument()
      expect(screen.getByText('Recovery Options')).toBeInTheDocument()
      expect(screen.getByText('Create Full Backup')).toBeInTheDocument()
      expect(screen.getByText('Restore from Latest Backup')).toBeInTheDocument()
    })
  })

  it('handles refresh functionality', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Administrative Management')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    // The component should still be functional after refresh
    expect(screen.getByText('Administrative Management')).toBeInTheDocument()
  })
})