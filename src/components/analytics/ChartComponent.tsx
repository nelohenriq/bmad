import React from 'react'

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }>
}

export interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut'
  data: ChartData
  title?: string
  width?: number
  height?: number
  className?: string
}

// Simple SVG-based chart components for basic visualization
// In a real implementation, these would use a proper charting library

export function ChartComponent({
  type,
  data,
  title,
  width = 400,
  height = 300,
  className = ''
}: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <BarChart data={data} width={width} height={height} />
      case 'line':
        return <LineChart data={data} width={width} height={height} />
      case 'pie':
        return <PieChart data={data} width={width} height={height} />
      case 'doughnut':
        return <DoughnutChart data={data} width={width} height={height} />
      default:
        return <div>Unsupported chart type</div>
    }
  }

  return (
    <div className={`chart-container ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center text-foreground">{title}</h3>
      )}
      <div className="chart-wrapper" style={{ width, height }}>
        {renderChart()}
      </div>
    </div>
  )
}

function BarChart({ data, width, height }: { data: ChartData; width: number; height: number }) {
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Handle empty data
  if (!data.datasets[0] || data.datasets[0].data.length === 0 || data.labels.length === 0) {
    return (
      <svg width={width} height={height} className="border border-border rounded-lg bg-card">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="text-muted-foreground fill-current">
          No data available
        </text>
      </svg>
    )
  }

  const maxValue = Math.max(...data.datasets[0].data)
  const barWidth = Math.max(chartWidth / data.labels.length * 0.8, 20)
  const barSpacing = chartWidth / data.labels.length

  return (
    <svg width={width} height={height} className="border border-border rounded-lg bg-card">
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border opacity-30"/>
        </pattern>
      </defs>
      <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#grid)" />

      {/* Y-axis labels and grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding + chartHeight - (ratio * chartHeight)
        return (
          <g key={i}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border opacity-50"
            />
            <text
              x={padding - 15}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        )
      })}

      {/* Bars with gradient */}
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
        </linearGradient>
      </defs>

      {data.datasets[0].data.map((value, index) => {
        const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0
        const x = padding + index * barSpacing + (barSpacing - barWidth) / 2
        const y = padding + chartHeight - barHeight

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill="url(#barGradient)"
            className="hover:opacity-80 transition-opacity cursor-pointer"
            rx="2"
          />
        )
      })}

      {/* X-axis labels */}
      {data.labels.map((label, index) => (
        <text
          key={index}
          x={padding + index * barSpacing + barSpacing / 2}
          y={height - 20}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {label}
        </text>
      ))}

      {/* Y-axis title */}
      <text
        x={15}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, 15, ${height / 2})`}
        className="text-sm fill-muted-foreground"
      >
        Count
      </text>
    </svg>
  )
}

function LineChart({ data, width, height }: { data: ChartData; width: number; height: number }) {
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Handle empty data
  if (!data.datasets[0] || data.datasets[0].data.length === 0 || data.labels.length === 0) {
    return (
      <svg width={width} height={height} className="border border-border rounded-lg bg-card">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="text-muted-foreground fill-current">
          No data available
        </text>
      </svg>
    )
  }

  const maxValue = Math.max(...data.datasets[0].data)
  const points = data.datasets[0].data.map((value, index) => {
    // Handle single data point case
    const divisor = Math.max(data.labels.length - 1, 1)
    const x = padding + (index / divisor) * chartWidth
    const y = padding + chartHeight - (maxValue > 0 ? (value / maxValue) * chartHeight : 0)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="border border-border rounded-lg bg-card">
      {/* Background grid */}
      <defs>
        <pattern id="lineGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border opacity-30"/>
        </pattern>
      </defs>
      <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#lineGrid)" />

      {/* Y-axis labels and grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding + chartHeight - (ratio * chartHeight)
        return (
          <g key={i}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border opacity-50"
            />
            <text
              x={padding - 15}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        )
      })}

      {/* Line with gradient */}
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <polyline
        points={points}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="3"
        className="drop-shadow-sm"
      />

      {/* Data points with glow effect */}
      {data.datasets[0].data.map((value, index) => {
        // Handle single data point case
        const divisor = Math.max(data.labels.length - 1, 1)
        const x = padding + (index / divisor) * chartWidth
        const y = padding + chartHeight - (maxValue > 0 ? (value / maxValue) * chartHeight : 0)

        return (
          <g key={index}>
            {/* Glow effect */}
            <circle
              cx={x}
              cy={y}
              r="6"
              fill="url(#lineGradient)"
              opacity="0.3"
            />
            {/* Main point */}
            <circle
              cx={x}
              cy={y}
              r="4"
              fill="url(#lineGradient)"
              className="hover:r-5 transition-all cursor-pointer"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )
      })}

      {/* X-axis labels */}
      {data.labels.map((label, index) => {
        // Handle single data point case
        const divisor = Math.max(data.labels.length - 1, 1)
        const x = padding + (index / divisor) * chartWidth

        return (
          <text
            key={index}
            x={x}
            y={height - 20}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            {label}
          </text>
        )
      })}

      {/* Y-axis title */}
      <text
        x={15}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, 15, ${height / 2})`}
        className="text-sm fill-muted-foreground"
      >
        Value
      </text>
    </svg>
  )
}

function PieChart({ data, width, height }: { data: ChartData; width: number; height: number }) {
  // Handle empty data
  if (!data.datasets[0] || data.datasets[0].data.length === 0 || data.labels.length === 0) {
    return (
      <svg width={width} height={height} className="border border-border rounded-lg bg-card">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="text-muted-foreground fill-current">
          No data available
        </text>
      </svg>
    )
  }

  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2 - 30

  const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0)
  let currentAngle = -Math.PI / 2 // Start from top

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ]

  return (
    <svg width={width} height={height} className="border border-border rounded-lg bg-card">
      {/* Pie slices */}
      {data.datasets[0].data.map((value, index) => {
        const percentage = value / total
        const angle = percentage * 2 * Math.PI
        const startAngle = currentAngle
        const endAngle = currentAngle + angle

        const x1 = centerX + radius * Math.cos(startAngle)
        const y1 = centerY + radius * Math.sin(startAngle)
        const x2 = centerX + radius * Math.cos(endAngle)
        const y2 = centerY + radius * Math.sin(endAngle)

        const largeArcFlag = percentage > 0.5 ? 1 : 0

        const pathData = [
          `M ${centerX} ${centerY}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ')

        currentAngle = endAngle

        return (
          <path
            key={index}
            d={pathData}
            fill={colors[index % colors.length]}
            className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-sm"
            stroke="white"
            strokeWidth="1"
          />
        )
      })}

      {/* Center label */}
      <text
        x={centerX}
        y={centerY - 5}
        textAnchor="middle"
        className="text-lg font-semibold fill-foreground"
      >
        {total}
      </text>
      <text
        x={centerX}
        y={centerY + 15}
        textAnchor="middle"
        className="text-sm fill-muted-foreground"
      >
        Total
      </text>

      {/* Legend */}
      {data.labels.map((label, index) => (
        <g key={index}>
          <rect
            x={width - 140}
            y={20 + index * 25}
            width={16}
            height={16}
            fill={colors[index % colors.length]}
            rx="2"
            className="drop-shadow-sm"
          />
          <text
            x={width - 115}
            y={32 + index * 25}
            className="text-sm fill-foreground"
          >
            {label}: {data.datasets[0].data[index]}
          </text>
        </g>
      ))}
    </svg>
  )
}

function DoughnutChart({ data, width, height }: { data: ChartData; width: number; height: number }) {
  // Handle empty data
  if (!data.datasets[0] || data.datasets[0].data.length === 0 || data.labels.length === 0) {
    return (
      <svg width={width} height={height} className="border rounded">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="text-gray-500">
          No data available
        </text>
      </svg>
    )
  }

  const centerX = width / 2
  const centerY = height / 2
  const outerRadius = Math.min(width, height) / 2 - 20
  const innerRadius = outerRadius * 0.6

  const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0)
  let currentAngle = -Math.PI / 2

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ]

  return (
    <svg width={width} height={height} className="border rounded">
      {data.datasets[0].data.map((value, index) => {
        const percentage = value / total
        const angle = percentage * 2 * Math.PI
        const startAngle = currentAngle
        const endAngle = currentAngle + angle

        const x1 = centerX + outerRadius * Math.cos(startAngle)
        const y1 = centerY + outerRadius * Math.sin(startAngle)
        const x2 = centerX + outerRadius * Math.cos(endAngle)
        const y2 = centerY + outerRadius * Math.sin(endAngle)

        const largeArcFlag = percentage > 0.5 ? 1 : 0

        const pathData = [
          `M ${x1} ${y1}`,
          `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          `L ${centerX + innerRadius * Math.cos(endAngle)} ${centerY + innerRadius * Math.sin(endAngle)}`,
          `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${centerX + innerRadius * Math.cos(startAngle)} ${centerY + innerRadius * Math.sin(startAngle)}`,
          'Z'
        ].join(' ')

        currentAngle = endAngle

        return (
          <path
            key={index}
            d={pathData}
            fill={colors[index % colors.length]}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        )
      })}

      {/* Center text */}
      <text
        x={centerX}
        y={centerY - 5}
        textAnchor="middle"
        className="text-lg font-semibold fill-gray-700"
      >
        {total}
      </text>
      <text
        x={centerX}
        y={centerY + 15}
        textAnchor="middle"
        className="text-sm fill-gray-500"
      >
        Total
      </text>

      {/* Legend */}
      {data.labels.map((label, index) => (
        <g key={index}>
          <rect
            x={width - 120}
            y={20 + index * 20}
            width={12}
            height={12}
            fill={colors[index % colors.length]}
          />
          <text
            x={width - 100}
            y={30 + index * 20}
            className="text-sm fill-gray-700"
          >
            {label}: {data.datasets[0].data[index]}
          </text>
        </g>
      ))}
    </svg>
  )
}