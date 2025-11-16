import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Sliders, Eye, BarChart3, Settings } from 'lucide-react'
import { VoiceParameters, VoiceTuningSession, type VoicePreview } from '../../types/voice-consistency'
import { ParameterSlider } from './ParameterSlider'
import { ToneSelector } from './ToneSelector'

interface VoiceTuningInterfaceProps {
  profileId: string
  onSave?: (parameters: VoiceParameters) => void
  onReset?: () => void
  initialParameters?: VoiceParameters
}



const VoicePreview: React.FC<{
  parameters: VoiceParameters
  analysis?: any
}> = ({ parameters, analysis }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        Voice Preview
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{parameters.formalityLevel}</div>
            <div className="text-sm text-gray-500">Formality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{parameters.complexityLevel}</div>
            <div className="text-sm text-gray-500">Complexity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{parameters.engagementLevel}</div>
            <div className="text-sm text-gray-500">Engagement</div>
          </div>
        </div>
        {analysis && (
          <div className="text-sm text-gray-600">
            <p>Analysis: {JSON.stringify(analysis, null, 2)}</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)

const ComparisonTool: React.FC<{
  before: VoiceParameters
  after: VoiceParameters
}> = ({ before, after }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Before/After Comparison
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Before</h4>
          <div className="space-y-1 text-sm">
            <div>Formality: {before.formalityLevel}</div>
            <div>Complexity: {before.complexityLevel}</div>
            <div>Engagement: {before.engagementLevel}</div>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">After</h4>
          <div className="space-y-1 text-sm">
            <div>Formality: {after.formalityLevel}</div>
            <div>Complexity: {after.complexityLevel}</div>
            <div>Engagement: {after.engagementLevel}</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const TuningControls: React.FC<{
  onSave: () => void
  onReset: () => void
  onExport: () => void
  onImport: () => void
  isLoading?: boolean
}> = ({ onSave, onReset, onExport, onImport, isLoading }) => (
  <div className="flex gap-2">
    <Button onClick={onSave} disabled={isLoading}>
      <Settings className="h-4 w-4 mr-2" />
      Save
    </Button>
    <Button variant="outline" onClick={onReset}>
      Reset
    </Button>
    <Button variant="outline" onClick={onExport}>
      Export
    </Button>
    <Button variant="outline" onClick={onImport}>
      Import
    </Button>
  </div>
)

export const VoiceTuningInterface: React.FC<VoiceTuningInterfaceProps> = ({
  profileId,
  onSave,
  onReset,
  initialParameters = {
    formalityLevel: 50,
    complexityLevel: 50,
    engagementLevel: 50,
  },
}) => {
  const [parameters, setParameters] = useState<VoiceParameters>(initialParameters)
  const [selectedTone, setSelectedTone] = useState<string>()
  const [previewData, setPreviewData] = useState<VoicePreview[]>()
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState<VoiceTuningSession>()

  // Initialize tuning session
  useEffect(() => {
    const newSession: VoiceTuningSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profileId,
      userId: 'current-user', // TODO: Get from auth
      startTime: new Date(),
      initialParameters,
      parameterAdjustments: [],
      previewData: [],
    }
    setSession(newSession)
  }, [profileId, initialParameters])

  const handleParameterChange = useCallback((parameter: keyof VoiceParameters, value: number) => {
    setParameters(prev => ({ ...prev, [parameter]: value }))

    // Track adjustment
    if (session) {
      const adjustment = {
        parameter,
        previousValue: parameters[parameter],
        newValue: value,
        timestamp: new Date(),
        confidence: 0.8, // TODO: Calculate based on analysis
      }
      setSession(prev => prev ? {
        ...prev,
        parameterAdjustments: [...prev.parameterAdjustments, adjustment]
      } : prev)
    }

    // Trigger preview update
    updatePreview({ ...parameters, [parameter]: value })
  }, [parameters, session])

  const updatePreview = useCallback(async (params: VoiceParameters) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/voice/profiles/${profileId}/preview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters: params }),
      })

      if (response.ok) {
        const data = await response.json()
        const preview: VoicePreview = {
          timestamp: new Date(),
          parameters: params,
          analysis: data.analysis,
          quality: data.quality,
        }
        setPreviewData(prev => [...(prev || []), preview])
      }
    } catch (error) {
      console.error('Preview update failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profileId])

  const handleSave = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/voice/profiles/${profileId}/tune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters,
          session,
        }),
      })

      if (response.ok) {
        onSave?.(parameters)
        // Reset session
        setSession(prev => prev ? { ...prev, endTime: new Date(), finalParameters: parameters } : prev)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profileId, parameters, session, onSave])

  const handleReset = useCallback(() => {
    setParameters(initialParameters)
    setSelectedTone(undefined)
    setPreviewData([])
    onReset?.()
  }, [initialParameters, onReset])

  const handleExport = useCallback(() => {
    const data = {
      parameters,
      session,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voice-tuning-${profileId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [parameters, session, profileId])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            if (data.parameters) {
              setParameters(data.parameters)
            }
          } catch (error) {
            console.error('Import failed:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [])

  const latestPreview = previewData?.[previewData.length - 1]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Voice Tuning Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parameter Controls */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Voice Parameters</h3>
                <div className="space-y-4">
                  <ParameterSlider
                    parameter="formalityLevel"
                    value={parameters.formalityLevel}
                    onChange={(value) => handleParameterChange('formalityLevel', value)}
                    label="Formality Level"
                  />
                  <ParameterSlider
                    parameter="complexityLevel"
                    value={parameters.complexityLevel}
                    onChange={(value) => handleParameterChange('complexityLevel', value)}
                    label="Complexity Level"
                  />
                  <ParameterSlider
                    parameter="engagementLevel"
                    value={parameters.engagementLevel}
                    onChange={(value) => handleParameterChange('engagementLevel', value)}
                    label="Engagement Level"
                  />
                </div>
              </div>

              <ToneSelector
                selectedTone={selectedTone}
                onToneSelect={setSelectedTone}
              />

              <TuningControls
                onSave={handleSave}
                onReset={handleReset}
                onExport={handleExport}
                onImport={handleImport}
                isLoading={isLoading}
              />
            </div>

            {/* Preview and Analysis */}
            <div className="space-y-6">
              <VoicePreview
                parameters={parameters}
                analysis={latestPreview?.analysis}
              />

              <ComparisonTool
                before={initialParameters}
                after={parameters}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VoiceTuningInterface