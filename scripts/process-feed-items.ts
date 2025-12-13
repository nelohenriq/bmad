#!/usr/bin/env tsx

/**
 * Feed Item Processing Script
 * Processes all unprocessed feed items: chunks → embeds → stores in vector DB
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.infrastructure' })

import { feedProcessingService } from '../src/services/feedProcessingService'

async function main() {
  console.log('🚀 Starting Feed Item Processing')
  console.log('=' .repeat(50))

  try {
    // Get initial stats
    console.log('📊 Initial Statistics:')
    const initialStats = await feedProcessingService.getProcessingStats()
    console.log(`- Total feed items: ${initialStats.totalFeedItems}`)
    console.log(`- Processed items: ${initialStats.processedItems}`)
    console.log(`- Unprocessed items: ${initialStats.unprocessedItems}`)
    console.log(`- Total chunks: ${initialStats.totalChunks}`)
    console.log(`- Qdrant status: ${JSON.stringify(initialStats.qdrantStats)}`)
    console.log()

    if (initialStats.unprocessedItems === 0) {
      console.log('✅ All feed items are already processed!')
      return
    }

    // Start processing
    console.log('⚙️ Starting batch processing...')
    const startTime = Date.now()

    const processingStats = await feedProcessingService.processAllUnprocessedFeedItems(10) // Larger batch size

    const totalTime = Date.now() - startTime
    const avgTimePerItem = processingStats.totalFeedItems > 0
      ? (totalTime / processingStats.totalFeedItems).toFixed(2)
      : '0'

    console.log()
    console.log('📈 Processing Results:')
    console.log('=' .repeat(30))
    console.log(`Total feed items processed: ${processingStats.totalFeedItems}`)
    console.log(`Successfully processed: ${processingStats.processedItems}`)
    console.log(`Failed items: ${processingStats.failedItems}`)
    console.log(`Total chunks processed: ${processingStats.totalChunks}`)
    console.log(`Total embeddings generated: ${processingStats.totalEmbeddings}`)
    console.log(`Total vectors stored in Qdrant: ${processingStats.totalVectors}`)
    console.log(`Total processing time: ${(totalTime / 1000).toFixed(2)}s`)
    console.log(`Average time per item: ${avgTimePerItem}ms`)

    // Get final stats
    console.log()
    console.log('📊 Final Statistics:')
    const finalStats = await feedProcessingService.getProcessingStats()
    console.log(`- Total feed items: ${finalStats.totalFeedItems}`)
    console.log(`- Processed items: ${finalStats.processedItems}`)
    console.log(`- Unprocessed items: ${finalStats.unprocessedItems}`)
    console.log(`- Total chunks processed: ${finalStats.totalChunks}`)
    console.log(`- Qdrant vectors: ${finalStats.qdrantStats.vectorsCount || 0}`)

    // Test search functionality
    console.log()
    console.log('🧪 Testing search functionality...')
    try {
      const testResults = await feedProcessingService.searchFeedContent('artificial intelligence', 3)
      console.log(`✅ Search test successful: Found ${testResults.length} results`)
    } catch (error) {
      console.log(`⚠️ Search test failed: ${error}`)
    }

    console.log()
    console.log('🎉 Feed item processing completed successfully!')

    if (processingStats.failedItems > 0) {
      console.log(`⚠️ ${processingStats.failedItems} items failed processing. Check logs for details.`)
      process.exit(1)
    } else {
      console.log('✅ All items processed successfully!')
      process.exit(0)
    }

  } catch (error) {
    console.error('💥 Processing failed with error:', error)
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error)
  process.exit(1)
})

// Run the script
main().catch((error) => {
  console.error('💥 Script crashed:', error)
  process.exit(1)
})