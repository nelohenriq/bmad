import React from 'react'
import { Button } from '../ui/button'

interface ToneSelectorProps {
  selectedTone?: string
  onToneSelect: (tone: string) => void
  disabled?: boolean
}

const TONE_PROFILES = [
  { id: 'professional', label: 'Professional', description: 'Formal, authoritative tone' },
  { id: 'casual', label: 'Casual', description: 'Relaxed, conversational tone' },
  { id: 'friendly', label: 'Friendly', description: 'Warm, approachable tone' },
  { id: 'formal', label: 'Formal', description: 'Highly structured, academic tone' },
  { id: 'conversational', label: 'Conversational', description: 'Natural, engaging tone' },
  { id: 'authoritative', label: 'Authoritative', description: 'Confident, expert tone' },
]

export const ToneSelector: React.FC<ToneSelectorProps> = ({
  selectedTone,
  onToneSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700">
          Tone Profile
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Select a predefined tone profile to quickly adjust your voice characteristics
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {TONE_PROFILES.map((tone) => (
          <Button
            key={tone.id}
            variant={selectedTone === tone.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToneSelect(tone.id)}
            disabled={disabled}
            className="h-auto p-3 flex flex-col items-start"
            title={tone.description}
          >
            <span className="font-medium text-xs">{tone.label}</span>
            <span className="text-xs opacity-75 mt-1">{tone.description}</span>
          </Button>
        ))}
      </div>

      {selectedTone && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          Selected: <strong>{TONE_PROFILES.find(t => t.id === selectedTone)?.label}</strong>
        </div>
      )}
    </div>
  )
}

export default ToneSelector