import { SearchResult } from './vectorSearchService'

export interface AdvancedFilterCriteria {
  contentId?: string
  dateFrom?: Date
  dateTo?: Date
  wordCountMin?: number
  wordCountMax?: number
  charCountMin?: number
  charCountMax?: number
  chunkIndexMin?: number
  chunkIndexMax?: number
  model?: string
  scoreMin?: number
  scoreMax?: number
  contentType?: string[]
  source?: string[]
  tags?: string[]
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  criteria: AdvancedFilterCriteria
  createdAt: Date
  updatedAt: Date
}

export interface FilterState {
  activeFilters: AdvancedFilterCriteria
  presets: FilterPreset[]
  lastUsedPreset?: string
}

export class AdvancedFilteringService {
  private filterPresets = new Map<string, FilterPreset>()

  /**
   * Apply advanced filters to search results
   * @param results Search results to filter
   * @param criteria Filter criteria
   * @returns Filtered results
   */
  applyFilters(results: (SearchResult | any)[], criteria: AdvancedFilterCriteria): (SearchResult | any)[] {
    let filtered = [...results]

    // Content ID filter
    if (criteria.contentId) {
      filtered = filtered.filter(r => r.contentId === criteria.contentId)
    }

    // Date range filters
    if (criteria.dateFrom || criteria.dateTo) {
      filtered = filtered.filter(r => {
        const resultDate = new Date(r.metadata.generatedAt)
        if (criteria.dateFrom && resultDate < criteria.dateFrom) return false
        if (criteria.dateTo && resultDate > criteria.dateTo) return false
        return true
      })
    }

    // Word count filters
    if (criteria.wordCountMin !== undefined) {
      filtered = filtered.filter(r => r.metadata.wordCount >= criteria.wordCountMin!)
    }
    if (criteria.wordCountMax !== undefined) {
      filtered = filtered.filter(r => r.metadata.wordCount <= criteria.wordCountMax!)
    }

    // Character count filters
    if (criteria.charCountMin !== undefined) {
      filtered = filtered.filter(r => r.metadata.charCount >= criteria.charCountMin!)
    }
    if (criteria.charCountMax !== undefined) {
      filtered = filtered.filter(r => r.metadata.charCount <= criteria.charCountMax!)
    }

    // Chunk index filters
    if (criteria.chunkIndexMin !== undefined) {
      filtered = filtered.filter(r => r.metadata.chunkIndex >= criteria.chunkIndexMin!)
    }
    if (criteria.chunkIndexMax !== undefined) {
      filtered = filtered.filter(r => r.metadata.chunkIndex <= criteria.chunkIndexMax!)
    }

    // Model filter
    if (criteria.model) {
      filtered = filtered.filter(r => r.metadata.model === criteria.model)
    }

    // Score range filters
    if (criteria.scoreMin !== undefined) {
      filtered = filtered.filter(r => r.score >= criteria.scoreMin!)
    }
    if (criteria.scoreMax !== undefined) {
      filtered = filtered.filter(r => r.score <= criteria.scoreMax!)
    }

    // Content type filters
    if (criteria.contentType && criteria.contentType.length > 0) {
      filtered = filtered.filter(r => {
        // This would need content type metadata - for now, filter by file extensions or patterns
        const text = r.text.toLowerCase()
        return criteria.contentType!.some(type => {
          switch (type.toLowerCase()) {
            case 'article': return text.includes('article') || text.length > 500
            case 'summary': return text.length < 200
            case 'quote': return (text.startsWith('"') && text.endsWith('"')) || text.includes('said') || text.includes('stated')
            default: return true
          }
        })
      })
    }

    // Source filters
    if (criteria.source && criteria.source.length > 0) {
      filtered = filtered.filter(r =>
        r.contentInfo && criteria.source!.includes(r.contentInfo.source)
      )
    }

    // Tags filters (if implemented)
    if (criteria.tags && criteria.tags.length > 0) {
      // This would require tag metadata in results
      // For now, skip or implement basic text matching
      filtered = filtered.filter(r =>
        criteria.tags!.some(tag => r.text.toLowerCase().includes(tag.toLowerCase()))
      )
    }

    return filtered
  }

  /**
   * Create a filter preset
   * @param name Preset name
   * @param criteria Filter criteria
   * @param description Optional description
   * @returns Created preset
   */
  createPreset(name: string, criteria: AdvancedFilterCriteria, description?: string): FilterPreset {
    const preset: FilterPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      criteria: { ...criteria },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.filterPresets.set(preset.id, preset)
    return preset
  }

  /**
   * Get all filter presets
   * @returns Array of presets
   */
  getPresets(): FilterPreset[] {
    return Array.from(this.filterPresets.values())
  }

  /**
   * Get preset by ID
   * @param id Preset ID
   * @returns Preset or null
   */
  getPreset(id: string): FilterPreset | null {
    return this.filterPresets.get(id) || null
  }

  /**
   * Update preset
   * @param id Preset ID
   * @param updates Updates to apply
   * @returns Updated preset or null
   */
  updatePreset(id: string, updates: Partial<Omit<FilterPreset, 'id' | 'createdAt'>>): FilterPreset | null {
    const preset = this.filterPresets.get(id)
    if (!preset) return null

    Object.assign(preset, updates, { updatedAt: new Date() })
    return preset
  }

  /**
   * Delete preset
   * @param id Preset ID
   * @returns Success boolean
   */
  deletePreset(id: string): boolean {
    return this.filterPresets.delete(id)
  }

  /**
   * Get filter statistics
   * @returns Filter usage statistics
   */
  getFilterStats(): {
    totalPresets: number
    activeFilters: string[]
    commonFilters: Record<string, number>
  } {
    const presets = this.getPresets()
    const activeFilters: string[] = []
    const commonFilters: Record<string, number> = {}

    presets.forEach(preset => {
      const criteria = preset.criteria

      if (criteria.contentId) activeFilters.push('contentId')
      if (criteria.dateFrom || criteria.dateTo) activeFilters.push('dateRange')
      if (criteria.wordCountMin || criteria.wordCountMax) activeFilters.push('wordCount')
      if (criteria.charCountMin || criteria.charCountMax) activeFilters.push('charCount')
      if (criteria.chunkIndexMin || criteria.chunkIndexMax) activeFilters.push('chunkIndex')
      if (criteria.model) activeFilters.push('model')
      if (criteria.scoreMin || criteria.scoreMax) activeFilters.push('score')
      if (criteria.contentType) activeFilters.push('contentType')
      if (criteria.source) activeFilters.push('source')
      if (criteria.tags) activeFilters.push('tags')
    })

    // Count occurrences
    activeFilters.forEach(filter => {
      commonFilters[filter] = (commonFilters[filter] || 0) + 1
    })

    return {
      totalPresets: presets.length,
      activeFilters: [...new Set(activeFilters)],
      commonFilters
    }
  }

  /**
   * Validate filter criteria
   * @param criteria Filter criteria to validate
   * @returns Validation result
   */
  validateCriteria(criteria: AdvancedFilterCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (criteria.wordCountMin !== undefined && criteria.wordCountMax !== undefined &&
        criteria.wordCountMin > criteria.wordCountMax) {
      errors.push('wordCountMin cannot be greater than wordCountMax')
    }

    if (criteria.charCountMin !== undefined && criteria.charCountMax !== undefined &&
        criteria.charCountMin > criteria.charCountMax) {
      errors.push('charCountMin cannot be greater than charCountMax')
    }

    if (criteria.chunkIndexMin !== undefined && criteria.chunkIndexMax !== undefined &&
        criteria.chunkIndexMin > criteria.chunkIndexMax) {
      errors.push('chunkIndexMin cannot be greater than chunkIndexMax')
    }

    if (criteria.scoreMin !== undefined && criteria.scoreMax !== undefined &&
        criteria.scoreMin > criteria.scoreMax) {
      errors.push('scoreMin cannot be greater than scoreMax')
    }

    if (criteria.dateFrom && criteria.dateTo && criteria.dateFrom > criteria.dateTo) {
      errors.push('dateFrom cannot be after dateTo')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Combine multiple filter criteria
   * @param criteria Array of filter criteria
   * @returns Combined criteria
   */
  combineCriteria(criteria: AdvancedFilterCriteria[]): AdvancedFilterCriteria {
    const combined: AdvancedFilterCriteria = {}

    criteria.forEach(criterion => {
      Object.entries(criterion).forEach(([key, value]) => {
        if (value !== undefined) {
          // For arrays, combine uniquely
          if (Array.isArray(value)) {
            if (!combined[key as keyof AdvancedFilterCriteria]) {
              (combined as any)[key] = []
            }
            const existing = (combined as any)[key] as string[]
            ;(combined as any)[key] = [...new Set([...existing, ...value])]
          } else {
            // For other values, use the most restrictive (this is simplistic)
            (combined as any)[key] = value
          }
        }
      })
    })

    return combined
  }
}

export const advancedFilteringService = new AdvancedFilteringService()