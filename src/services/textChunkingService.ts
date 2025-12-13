export interface TextChunk {
  id: string
  text: string
  startIndex: number
  endIndex: number
  wordCount: number
  charCount: number
}

export interface ChunkingOptions {
  chunkSize?: number // Target words per chunk
  overlap?: number // Words to overlap between chunks
  minChunkSize?: number // Minimum words per chunk
  maxChunkSize?: number // Maximum words per chunk
  preserveSentences?: boolean // Try to break at sentence boundaries
}

export class TextChunkingService {
  private defaultOptions: Required<ChunkingOptions> = {
    chunkSize: 200,
    overlap: 50,
    minChunkSize: 50,
    maxChunkSize: 500,
    preserveSentences: true
  }

  /**
   * Split text into overlapping chunks
   */
  chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
    const opts = { ...this.defaultOptions, ...options }
    const chunks: TextChunk[] = []

    // Clean and normalize text
    const cleanText = this.cleanText(text)
    if (!cleanText.trim()) return chunks

    // Split into words with position tracking
    const words = this.splitIntoWords(cleanText)

    if (words.length === 0) return chunks

    let currentIndex = 0
    let chunkIndex = 0

    while (currentIndex < words.length) {
      const chunk = this.createChunk(
        words,
        currentIndex,
        opts,
        chunkIndex++
      )

      if (chunk) {
        chunks.push(chunk)
        // Move forward by chunk size minus overlap
        currentIndex += Math.max(1, opts.chunkSize - opts.overlap)
      } else {
        // If we can't create a chunk, move forward by 1
        currentIndex++
      }
    }

    return chunks
  }

  /**
   * Clean and normalize text for chunking
   */
  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Trim whitespace
      .trim()
  }

  /**
   * Split text into words with position tracking
   */
  private splitIntoWords(text: string): Array<{ word: string; start: number; end: number }> {
    const words: Array<{ word: string; start: number; end: number }> = []
    const wordRegex = /\S+/g
    let match

    while ((match = wordRegex.exec(text)) !== null) {
      words.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length
      })
    }

    return words
  }

  /**
   * Create a single chunk from words array
   */
  private createChunk(
    words: Array<{ word: string; start: number; end: number }>,
    startIndex: number,
    options: Required<ChunkingOptions>,
    chunkId: number
  ): TextChunk | null {
    const { chunkSize, minChunkSize, maxChunkSize, preserveSentences } = options

    if (startIndex >= words.length) return null

    let endIndex = Math.min(startIndex + chunkSize, words.length)

    // If preserving sentences, try to find a good break point
    if (preserveSentences && endIndex < words.length) {
      endIndex = this.findSentenceBoundary(words, startIndex, endIndex)
    }

    // Ensure minimum chunk size
    if (endIndex - startIndex < minChunkSize && endIndex < words.length) {
      endIndex = Math.min(startIndex + minChunkSize, words.length)
    }

    // Ensure maximum chunk size
    if (endIndex - startIndex > maxChunkSize) {
      endIndex = startIndex + maxChunkSize
    }

    // Don't create chunks smaller than minimum
    if (endIndex - startIndex < minChunkSize && startIndex > 0) {
      return null
    }

    const chunkWords = words.slice(startIndex, endIndex)
    const chunkText = chunkWords.map(w => w.word).join(' ')
    const charCount = chunkText.length
    const wordCount = chunkWords.length

    return {
      id: `chunk_${chunkId}`,
      text: chunkText,
      startIndex: words[startIndex].start,
      endIndex: words[endIndex - 1].end,
      wordCount,
      charCount
    }
  }

  /**
   * Find a good sentence boundary within the chunk range
   */
  private findSentenceBoundary(
    words: Array<{ word: string; start: number; end: number }>,
    startIndex: number,
    maxEndIndex: number
  ): number {
    // Look for sentence endings (., !, ?) within the preferred range
    const sentenceEnders = ['.', '!', '?']

    for (let i = maxEndIndex - 1; i >= startIndex; i--) {
      const word = words[i].word
      if (sentenceEnders.some(ender => word.includes(ender))) {
        // Found a sentence boundary, return position after this word
        return i + 1
      }
    }

    // No sentence boundary found, return original max
    return maxEndIndex
  }

  /**
   * Estimate tokens for a text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 0.75 words for English text
    const words = text.trim().split(/\s+/).length
    return Math.ceil(words * 1.33)
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(text: string, chunks: TextChunk[]): {
    originalTextLength: number
    originalWordCount: number
    chunkCount: number
    averageChunkSize: number
    totalOverlapWords: number
  } {
    const originalWordCount = text.trim().split(/\s+/).length

    if (chunks.length === 0) {
      return {
        originalTextLength: text.length,
        originalWordCount,
        chunkCount: 0,
        averageChunkSize: 0,
        totalOverlapWords: 0
      }
    }

    const totalChunkWords = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)
    const averageChunkSize = totalChunkWords / chunks.length

    // Estimate overlap (this is approximate)
    const estimatedOverlap = (chunks.length - 1) * 25 // Assume 25 words overlap on average

    return {
      originalTextLength: text.length,
      originalWordCount,
      chunkCount: chunks.length,
      averageChunkSize,
      totalOverlapWords: Math.max(0, estimatedOverlap)
    }
  }
}

export const textChunkingService = new TextChunkingService()