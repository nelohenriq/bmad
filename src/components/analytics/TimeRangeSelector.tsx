import React, { useState } from 'react'

export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom'

export interface TimeRangeSelectorProps {
  selectedRange: TimeRange
  onRangeChange: (range: TimeRange) => void
  customStartDate?: Date
  customEndDate?: Date
  onCustomDatesChange?: (start: Date, end: Date) => void
  className?: string
}

export function TimeRangeSelector({
  selectedRange,
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomDatesChange,
  className = ''
}: TimeRangeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const rangeOptions = [
    { value: 'day' as TimeRange, label: 'Last 24 Hours' },
    { value: 'week' as TimeRange, label: 'Last 7 Days' },
    { value: 'month' as TimeRange, label: 'Last 30 Days' },
    { value: 'year' as TimeRange, label: 'Last Year' },
    { value: 'custom' as TimeRange, label: 'Custom Range' }
  ]

  const handleRangeChange = (range: TimeRange) => {
    onRangeChange(range)
    setShowCustomPicker(range === 'custom')
  }

  const handleCustomDateChange = (type: 'start' | 'end', date: string) => {
    const newDate = new Date(date)
    if (type === 'start' && customEndDate && onCustomDatesChange) {
      onCustomDatesChange(newDate, customEndDate)
    } else if (type === 'end' && customStartDate && onCustomDatesChange) {
      onCustomDatesChange(customStartDate, newDate)
    }
  }

  return (
    <div className={`time-range-selector ${className}`}>
      <div className="flex flex-wrap gap-2 mb-4">
        {rangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRangeChange(option.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedRange === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Select Date Range</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                max={customEndDate?.toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                min={customStartDate?.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setShowCustomPicker(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick preset buttons for common time ranges
export function QuickTimeRangeSelector({
  onRangeSelect,
  className = ''
}: {
  onRangeSelect: (range: TimeRange, start?: Date, end?: Date) => void
  className?: string
}) {
  const quickRanges = [
    {
      label: 'Today',
      range: 'day' as TimeRange,
      getDates: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        return { start, end }
      }
    },
    {
      label: 'This Week',
      range: 'week' as TimeRange,
      getDates: () => {
        const now = new Date()
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { start, end: now }
      }
    },
    {
      label: 'This Month',
      range: 'month' as TimeRange,
      getDates: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start, end: now }
      }
    },
    {
      label: 'Last 30 Days',
      range: 'month' as TimeRange,
      getDates: () => {
        const now = new Date()
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { start, end: now }
      }
    },
    {
      label: 'This Year',
      range: 'year' as TimeRange,
      getDates: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), 0, 1)
        return { start, end: now }
      }
    }
  ]

  return (
    <div className={`quick-time-selector flex flex-wrap gap-2 ${className}`}>
      {quickRanges.map((preset) => (
        <button
          key={preset.label}
          onClick={() => {
            const dates = preset.getDates()
            onRangeSelect(preset.range, dates.start, dates.end)
          }}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

// Combined time range selector with both preset buttons and custom picker
export function AdvancedTimeRangeSelector({
  selectedRange,
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomDatesChange,
  className = ''
}: TimeRangeSelectorProps) {
  return (
    <div className={`advanced-time-selector ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Time Range</h3>
        <QuickTimeRangeSelector
          onRangeSelect={(range, start, end) => {
            onRangeChange(range)
            if (start && end && onCustomDatesChange) {
              onCustomDatesChange(start, end)
            }
          }}
        />
      </div>

      <TimeRangeSelector
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDatesChange={onCustomDatesChange}
      />
    </div>
  )
}