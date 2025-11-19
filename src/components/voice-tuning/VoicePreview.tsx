import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Eye } from 'lucide-react'
import { VoiceParameters, VoiceAnalysisResult } from '../../types/voice-consistency'

interface VoicePreviewProps {
  parameters: VoiceParameters
  analysis?: VoiceAnalysisResult
  isLoading?: boolean
}

export const VoicePreview: React.FC<VoicePreviewProps> = ({
  parameters,
  analysis,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Voice Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Analyzing...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Voice Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="mt-4 text-sm text-gray-600">
            <p>Overall Score: {analysis.overallScore.toFixed(2)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default VoicePreview