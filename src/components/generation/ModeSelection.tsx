import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Brain, Zap, Target, MessageSquare, Code, BookOpen } from 'lucide-react'

interface GenerationMode {
  id: string
  name: string
  description: string
  performanceProfile: {
    expectedTokens: number
    processingTimeMs: number
    qualityPriority: 'speed' | 'balance' | 'quality'
  }
}

interface ModeSelectionProps {
  modes: GenerationMode[]
  selectedMode: string
  onModeChange: (modeId: string) => void
  disabled?: boolean
}

const getModeIcon = (modeId: string) => {
  switch (modeId) {
    case 'creative':
      return <Brain className="w-4 h-4" />
    case 'factual':
      return <Target className="w-4 h-4" />
    case 'summary':
      return <BookOpen className="w-4 h-4" />
    case 'conversational':
      return <MessageSquare className="w-4 h-4" />
    case 'technical':
      return <Code className="w-4 h-4" />
    default:
      return <Zap className="w-4 h-4" />
  }
}

const getModeColor = (modeId: string) => {
  switch (modeId) {
    case 'creative':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case 'factual':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'summary':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'conversational':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    case 'technical':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    default:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  }
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  modes,
  selectedMode,
  onModeChange,
  disabled = false
}) => {
  // Ensure modes is an array
  const modesArray = Array.isArray(modes) ? modes : []

  const selectedModeData = modesArray.find(mode => mode.id === selectedMode)

  const modeOptions = modesArray.map(mode => ({
    value: mode.id,
    label: mode.name
  }))

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Generation Mode
      </label>

      <div className="space-y-4">
        <Select
          options={modeOptions}
          value={selectedMode}
          onChange={(e) => onModeChange(e.target.value)}
          placeholder="Select a generation mode..."
          disabled={disabled}
          className="w-full"
        />

        {selectedModeData && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {getModeIcon(selectedMode)}
                {selectedModeData.name}
                <Badge className={getModeColor(selectedMode)}>
                  {selectedModeData.performanceProfile.qualityPriority}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {selectedModeData.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  ~{Math.round(selectedModeData.performanceProfile.processingTimeMs / 1000)}s
                </span>
                <span>
                  {selectedModeData.performanceProfile.expectedTokens} tokens
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}