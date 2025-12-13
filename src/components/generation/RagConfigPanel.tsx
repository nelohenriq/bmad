import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '@/components/ui/tooltip'
import { Settings, Save, RotateCcw, Download, Upload, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react'

interface RagConfig {
  maxResults: number
  similarityThreshold: number
  includeMetadata: boolean
  dateRange: string
  sourceFilter: string
  vectorWeight: number
  keywordWeight: number
}

const DEFAULT_CONFIG: RagConfig = {
  maxResults: 10,
  similarityThreshold: 0.7,
  includeMetadata: true,
  dateRange: '',
  sourceFilter: '',
  vectorWeight: 0.7,
  keywordWeight: 0.3
}

const STORAGE_KEY = 'ragConfig'

export const RagConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<RagConfig>(DEFAULT_CONFIG)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsedConfig = JSON.parse(stored)
        setConfig({ ...DEFAULT_CONFIG, ...parsedConfig })
      } catch (error) {
        console.warn('Failed to parse stored RAG config:', error)
      }
    }
  }, [])

  // Validate configuration
  const validateConfig = (newConfig: RagConfig): Record<string, string> => {
    const newErrors: Record<string, string> = {}

    if (newConfig.maxResults < 1 || newConfig.maxResults > 50) {
      newErrors.maxResults = 'Max results must be between 1 and 50'
    }

    if (newConfig.similarityThreshold < 0 || newConfig.similarityThreshold > 1) {
      newErrors.similarityThreshold = 'Similarity threshold must be between 0 and 1'
    }

    if (newConfig.vectorWeight + newConfig.keywordWeight !== 1) {
      newErrors.weights = 'Vector and keyword weights must sum to 1.0'
    }

    if (newConfig.dateRange && !isValidDateRange(newConfig.dateRange)) {
      newErrors.dateRange = 'Invalid date range format'
    }

    return newErrors
  }

  // Check if date range is valid
  const isValidDateRange = (range: string): boolean => {
    // Simple validation - could be enhanced
    return range === '' || /^last \d+ days|^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(range)
  }

  // Update config and validate
  const updateConfig = (key: keyof RagConfig, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    setErrors(validateConfig(newConfig))
    setHasUnsavedChanges(true)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    const validationErrors = validateConfig(config)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaveStatus('saving')

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save RAG config:', error)
      setSaveStatus('error')
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setErrors({})
    setHasUnsavedChanges(true)
    setSaveStatus('idle')
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = 'rag-config.json'

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string)
        const newConfig = { ...DEFAULT_CONFIG, ...importedConfig }
        const validationErrors = validateConfig(newConfig)

        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors)
          return
        }

        setConfig(newConfig)
        setErrors({})
        setHasUnsavedChanges(true)
        setSaveStatus('idle')
      } catch (error) {
        console.error('Failed to import config:', error)
        setErrors({ import: 'Invalid configuration file' })
      }
    }
    reader.readAsText(file)
  }

  const maxResultsOptions = Array.from({ length: 50 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
  }))

  const thresholdOptions = Array.from({ length: 21 }, (_, i) => {
    const value = (i * 0.05).toFixed(2)
    return {
      value,
      label: `${(i * 5)}%`
    }
  })

  const getPerformanceWarning = () => {
    if (config.maxResults > 20) {
      return "High result count may impact performance"
    }
    if (config.similarityThreshold < 0.3) {
      return "Low threshold may return less relevant results"
    }
    return null
  }

  const performanceWarning = getPerformanceWarning()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          RAG Configuration
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved Changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Results */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Maximum Results
            </label>
            <TooltipWrapper content="Number of content chunks to retrieve. Higher values may impact performance.">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <Select
            options={maxResultsOptions}
            value={config.maxResults.toString()}
            onChange={(e) => updateConfig('maxResults', parseInt(e.target.value))}
            placeholder="Select max results"
            className={errors.maxResults ? 'border-red-500' : ''}
          />
          {errors.maxResults && (
            <p className="text-xs text-red-600 mt-1">{errors.maxResults}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of content chunks to retrieve (1-50)
          </p>
        </div>

        {/* Similarity Threshold */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Similarity Threshold
            </label>
            <TooltipWrapper content="Minimum relevance score for retrieved content. Higher values return more precise but fewer results.">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <Select
            options={thresholdOptions}
            value={config.similarityThreshold.toString()}
            onChange={(e) => updateConfig('similarityThreshold', parseFloat(e.target.value))}
            placeholder="Select threshold"
            className={errors.similarityThreshold ? 'border-red-500' : ''}
          />
          {errors.similarityThreshold && (
            <p className="text-xs text-red-600 mt-1">{errors.similarityThreshold}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum relevance score (0-100%)
          </p>
        </div>

        {/* Vector vs Keyword Weight */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Algorithm Weights
            </label>
            <TooltipWrapper content="Balance between semantic similarity (vector) and keyword matching. Weights must sum to 100%.">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Vector Weight
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.vectorWeight}
                onChange={(e) => updateConfig('vectorWeight', parseFloat(e.target.value))}
                className={errors.weights ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Keyword Weight
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.keywordWeight}
                onChange={(e) => updateConfig('keywordWeight', parseFloat(e.target.value))}
                className={errors.weights ? 'border-red-500' : ''}
              />
            </div>
          </div>
          {errors.weights && (
            <p className="text-xs text-red-600 mt-1">{errors.weights}</p>
          )}
        </div>

        {/* Include Metadata Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Metadata
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Include source information and timestamps
              </p>
            </div>
            <TooltipWrapper content="When enabled, retrieval results include source URLs, publication dates, and other metadata.">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <Button
            variant={config.includeMetadata ? "default" : "outline"}
            size="sm"
            onClick={() => updateConfig('includeMetadata', !config.includeMetadata)}
          >
            {config.includeMetadata ? 'Yes' : 'No'}
          </Button>
        </div>

        {/* Date Range Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Range (Optional)
            </label>
            <TooltipWrapper content="Limit retrieval to content from specific time periods. Examples: 'last 7 days', '2024-01-01 to 2024-01-31'">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <Input
            id="dateRange"
            type="text"
            placeholder="e.g., last 7 days, 2024-01-01 to 2024-01-31"
            value={config.dateRange}
            onChange={(e) => updateConfig('dateRange', e.target.value)}
            className={errors.dateRange ? 'border-red-500' : ''}
          />
          {errors.dateRange && (
            <p className="text-xs text-red-600 mt-1">{errors.dateRange}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Limit retrieval to content from specific time periods
          </p>
        </div>

        {/* Source Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="sourceFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Source Filter (Optional)
            </label>
            <TooltipWrapper content="Comma-separated list of domains to include or exclude. Prefix with '-' to exclude domains.">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </TooltipWrapper>
          </div>
          <Input
            id="sourceFilter"
            type="text"
            placeholder="e.g., techcrunch.com, nytimes.com, -spam.com"
            value={config.sourceFilter}
            onChange={(e) => updateConfig('sourceFilter', e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Comma-separated list of domains to include/exclude
          </p>
        </div>

        {/* Performance Warning */}
        {performanceWarning && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">{performanceWarning}</p>
          </div>
        )}

        {/* Import/Export */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export Config
          </Button>
          <div className="flex-1">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="config-import"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('config-import')?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Config
            </Button>
          </div>
        </div>

        {errors.import && (
          <p className="text-xs text-red-600">{errors.import}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={Object.keys(errors).length > 0}
          >
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Current Settings Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">Max: {config.maxResults}</Badge>
            <Badge variant="secondary">Threshold: {(config.similarityThreshold * 100).toFixed(0)}%</Badge>
            <Badge variant="secondary">Vector: {(config.vectorWeight * 100).toFixed(0)}%</Badge>
            <Badge variant="secondary">Keyword: {(config.keywordWeight * 100).toFixed(0)}%</Badge>
            <Badge variant="secondary">Metadata: {config.includeMetadata ? 'Yes' : 'No'}</Badge>
            {config.dateRange && <Badge variant="secondary">Date: {config.dateRange}</Badge>}
            {config.sourceFilter && <Badge variant="secondary">Sources: {config.sourceFilter}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}