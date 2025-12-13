import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PerformanceDashboard } from '@/components/admin/PerformanceDashboard'

// Mock the monitoring service
jest.mock('@/services/monitoring/monitoringService', () => ({
  monitoringService: {
    getPerformanceSummary: jest.fn(),
    getThroughputMetrics: jest.fn(),
    getCurrentResourceMetrics: jest.fn(),
    exportMetrics: jest.fn()
  }
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Server: () => <div data-testid="server-icon" />,
  Database: () => <div data-testid="database-icon" />
}))

import { monitoringService } from '@/services/monitoring/monitoringService'

const mockMonitoringService = monitoringService as jest.Mocked<typeof monitoringService>

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMonitoringService.getPerformanceSummary.mockReturnValue({
      totalRequests: 150,
      averageResponseTime: 250,
      errorRate: 0.02,
      topSlowOperations: [
        { operation: 'retrieval', avgTime: 300, count: 50 },
        { operation: 'generation', avgTime: 200, count: 100 }
      ],
      recentErrors: []
    })

    mockMonitoringService.getThroughputMetrics.mockReturnValue({
      operation: 'all',
      timeRange: '5m',
      requestCount: 150,
      averageResponseTime: 250,
      p95ResponseTime: 500,
      errorRate: 0.02
    })

    mockMonitoringService.getCurrentResourceMetrics.mockReturnValue({
      timestamp: new Date(),
      cpuUsage: 45.5,
      memoryUsage: 67.8,
      databaseConnections: 12,
      vectorOperations: 89,
      activeRequests: 5
    })

    mockMonitoringService.exportMetrics.mockReturnValue('timestamp,operation,duration,status\n2025-01-01T00:00:00.000Z,test,100,success')
  })

  it('renders loading state initially', () => {
    render(<PerformanceDashboard />)

    expect(screen.getByText('Loading performance data...')).toBeInTheDocument()
    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
  })

  it('renders dashboard with data after loading', async () => {
    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    expect(screen.getByText('150')).toBeInTheDocument() // Total Requests
    expect(screen.getByText('250ms')).toBeInTheDocument() // Avg Response Time
    expect(screen.getByText('2.0%')).toBeInTheDocument() // Error Rate
  })

  it('displays throughput metrics in the throughput tab', async () => {
    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    // Click on throughput tab
    const throughputTab = screen.getByRole('button', { name: /throughput/i })
    fireEvent.click(throughputTab)

    await waitFor(() => {
      expect(screen.getByText('Throughput Metrics (Last 5 minutes)')).toBeInTheDocument()
    })

    expect(screen.getByText('150')).toBeInTheDocument() // Request count
    expect(screen.getByText('250ms')).toBeInTheDocument() // Avg response time
    expect(screen.getByText('500ms')).toBeInTheDocument() // 95th percentile
  })

  it('displays operations data in the operations tab', async () => {
    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    // Click on operations tab
    const operationsTab = screen.getByRole('button', { name: /operations/i })
    fireEvent.click(operationsTab)

    await waitFor(() => {
      expect(screen.getByText('Slowest Operations')).toBeInTheDocument()
    })

    expect(screen.getByText('retrieval')).toBeInTheDocument()
    expect(screen.getByText('generation')).toBeInTheDocument()
    expect(screen.getByText('300ms')).toBeInTheDocument()
    expect(screen.getByText('200ms')).toBeInTheDocument()
  })

  it('displays resource metrics in the resources tab', async () => {
    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    // Click on resources tab
    const resourcesTab = screen.getByRole('button', { name: /resources/i })
    fireEvent.click(resourcesTab)

    await waitFor(() => {
      expect(screen.getByText('Resource Utilization')).toBeInTheDocument()
    })

    expect(screen.getByText('45.5%')).toBeInTheDocument() // CPU Usage
    expect(screen.getByText('67.8%')).toBeInTheDocument() // Memory Usage
    expect(screen.getByText('12')).toBeInTheDocument() // DB Connections
    expect(screen.getByText('89')).toBeInTheDocument() // Vector Ops
  })

  it('handles export functionality', async () => {
    // Mock URL and document methods
    const mockCreateObjectURL = jest.fn(() => 'mock-url')
    const mockRevokeObjectURL = jest.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    const mockClick = jest.fn()
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()

    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild

    // Mock anchor element
    const mockAnchor = {
      click: mockClick,
      href: '',
      download: '',
      style: {}
    }
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    const exportButton = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(exportButton)

    expect(monitoringService.exportMetrics).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })

  it('handles refresh functionality', async () => {
    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    // Should call the service methods again
    await waitFor(() => {
      expect(mockMonitoringService.getPerformanceSummary).toHaveBeenCalledTimes(2)
    })
  })

  it('displays error state when no data is available', async () => {
    mockMonitoringService.getPerformanceSummary.mockReturnValue({
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topSlowOperations: [],
      recentErrors: []
    })
    mockMonitoringService.getThroughputMetrics.mockReturnValue(null)
    mockMonitoringService.getCurrentResourceMetrics.mockReturnValue(null)

    render(<PerformanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument()
    })

    // Click on throughput tab
    const throughputTab = screen.getByRole('button', { name: /throughput/i })
    fireEvent.click(throughputTab)

    await waitFor(() => {
      expect(screen.getByText('No throughput data available')).toBeInTheDocument()
    })
  })
})