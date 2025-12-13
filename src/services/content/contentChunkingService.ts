import { vectorContentService, ContentChunk } from '../vector-content-service'
import { embeddingService } from '../embedding/embeddingService'
import { prisma } from '../database/prisma'

export interface ChunkingOptions {
  chunkSize?: number
  chunkOverlap?: number
  minChunkLength?: number
  maxChunkLength?: number
}

export interface ChunkingResult {
  chunks: ContentChunk[]
  totalChunks: number
  totalTokens: number
}

export class ContentChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 512
  private readonly DEFAULT_OVERLAP = 50
  private readonly MIN_CHUNK_LENGTH = 50
  private readonly MAX_CHUNK_LENGTH = 1024

  /**
   * Chunk content and generate embeddings for storage in vector database
   */
  async chunkAndEmbedContent(
    contentId: string,
    content: string,
    metadata: {
      title?: string
      sourceUrl?: string
      publishedAt?: Date
      feedTitle?: string
      author?: string
      tags?: string[]
      quality?: number
    },
    options: ChunkingOptions = {}
  ): Promise<ChunkingResult> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      minChunkLength = this.MIN_CHUNK_LENGTH,
      maxChunkLength = this.MAX_CHUNK_LENGTH
    } = options

    // Split content into chunks
    const textChunks = this.splitIntoChunks(content, chunkSize, chunkOverlap, minChunkLength, maxChunkLength)

    if (textChunks.length === 0) {
      return {
        chunks: [],
        totalChunks: 0,
        totalTokens: 0
      }
    }

    // Prepare chunks for embedding
    const chunksForEmbedding = textChunks.map((chunkText, index) => ({
      id: this.generateChunkId(contentId, index).toString(),
      text: chunkText
    }))

    // Generate embeddings for all chunks
    const embeddingResults = await embeddingService.generateEmbeddings(chunksForEmbedding)

    // Create ContentChunk objects
    const chunks: ContentChunk[] = textChunks.map((chunkText, index) => {
      const embeddingResult = embeddingResults.find(er => er.chunkId === chunksForEmbedding[index].id)
      return {
        id: this.generateChunkId(contentId, index),
        feedItemId: contentId,
        chunkIndex: index,
        content: chunkText,
        embedding: embeddingResult?.embedding || new Array(384).fill(0),
        metadata: {
          sourceUrl: metadata.sourceUrl,
          publishedAt: metadata.publishedAt,
          feedTitle: metadata.feedTitle,
          author: metadata.author,
          tags: metadata.tags || [],
          quality: metadata.quality || 0.8,
          language: 'en', // Default to English, could be detected
          wordCount: this.countWords(chunkText)
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Store chunks in vector database
    const storeResult = await vectorContentService.storeContentChunks(chunks)

    if (storeResult.failed > 0) {
      console.warn(`Failed to store ${storeResult.failed} chunks for content ${contentId}`)
    }

    // Store chunk metadata in PostgreSQL for reference
    await this.storeChunkMetadata(contentId, chunks)

    return {
      chunks,
      totalChunks: chunks.length,
      totalTokens: embeddingResults.reduce((sum, emb) => sum + emb.embedding.length, 0)
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number,
    minLength: number,
    maxLength: number
  ): string[] {
    const chunks: string[] = []
    const sentences = this.splitIntoSentences(text)
    let currentChunk = ''
    let currentLength = 0

    for (const sentence of sentences) {
      const sentenceLength = sentence.length

      // If adding this sentence would exceed max length, save current chunk
      if (currentLength + sentenceLength > maxLength && currentChunk.length >= minLength) {
        chunks.push(currentChunk.trim())
        // Start new chunk with overlap from previous chunk
        const words = currentChunk.split(' ')
        const overlapWords = words.slice(-Math.floor(overlap / 6)) // Rough word count for overlap
        currentChunk = overlapWords.join(' ') + ' ' + sentence
        currentLength = currentChunk.length
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence
        currentLength += sentenceLength + 1 // +1 for space
      }

      // If current chunk is getting too long, force split
      if (currentLength >= chunkSize && currentChunk.length >= minLength) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
        currentLength = sentenceLength
      }
    }

    // Add remaining chunk if it's long enough
    if (currentChunk.length >= minLength) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * Split text into sentences (basic implementation)
   */
  private splitIntoSentences(text: string): string[] {
    // Basic sentence splitting - could be enhanced with NLP library
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.')
  }

  /**
   * Generate unique chunk ID
   */
  private generateChunkId(contentId: string, chunkIndex: number): number {
    // Simple hash-based ID generation
    const combined = `${contentId}-${chunkIndex}`
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Store chunk metadata in PostgreSQL for reference
   */
  private async storeChunkMetadata(contentId: string, chunks: ContentChunk[]): Promise<void> {
    try {
      // Store in content_chunks table
      const chunkData = chunks.map(chunk => ({
        contentId,
        chunkText: chunk.content,
        chunkIndex: chunk.chunkIndex,
        wordCount: chunk.metadata.wordCount,
        charCount: chunk.content.length,
        startPosition: chunk.chunkIndex * 512, // Approximate
        endPosition: (chunk.chunkIndex + 1) * 512
      }))

      await prisma.contentChunk.createMany({
        data: chunkData,
        skipDuplicates: true
      })
    } catch (error) {
      console.error('Failed to store chunk metadata:', error)
      // Don't fail the entire process if metadata storage fails
    }
  }

  /**
   * Get chunking statistics for content
   */
  async getChunkingStats(contentId: string): Promise<{
    totalChunks: number
    totalWords: number
    averageChunkSize: number
  }> {
    try {
      const chunks = await prisma.contentChunk.findMany({
        where: { contentId },
        select: {
          wordCount: true,
          charCount: true
        }
      })

      const totalChunks = chunks.length
      const totalWords = chunks.reduce((sum, chunk) => sum + (chunk.wordCount || 0), 0)
      const averageChunkSize = totalChunks > 0 ? totalWords / totalChunks : 0

      return {
        totalChunks,
        totalWords,
        averageChunkSize
      }
    } catch (error) {
      console.error('Failed to get chunking stats:', error)
      return {
        totalChunks: 0,
        totalWords: 0,
        averageChunkSize: 0
      }
    }
  }
}

export const contentChunkingService = new ContentChunkingService()