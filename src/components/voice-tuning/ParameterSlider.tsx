import React from 'react'
import { VoiceParameters } from '../../types/voice-consistency'

interface ParameterSliderProps {
  parameter: keyof VoiceParameters
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
  parameter,
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    onChange(newValue)
  }

  const getParameterColor = (param: keyof VoiceParameters) => {
    switch (param) {
      case 'formalityLevel':
        return 'text-blue-600'
      case 'complexityLevel':
        return 'text-green-600'
      case 'engagementLevel':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`slider-${parameter}`}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <span className={`text-sm font-semibold ${getParameterColor(parameter)}`}>
          {value}
        </span>
      </div>

      <div className="relative">
        <input
          id={`slider-${parameter}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          aria-label={`${label} slider, current value ${value}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default ParameterSlider