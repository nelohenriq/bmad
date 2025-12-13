// src/lib/qdrant.ts
// Note: Using fetch-based implementation since @qdrant/js-client is not installed
// This provides basic Qdrant functionality for the infrastructure setup

// Collection configuration
export const COLLECTION_CONFIG = {
  name: 'feed_chunks',
  vectorSize: 384, // qwen3-embedding:4b embedding size
  distance: 'Cosine' as const
};

export async function ensureCollection(): Promise<void> {
  try {
    // Check if collection exists
    const response = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION_CONFIG.name}`);
    if (response.ok) {
      console.log(`Collection '${COLLECTION_CONFIG.name}' already exists`);
      return;
    }

    // Create collection if it doesn't exist
    console.log(`Creating collection '${COLLECTION_CONFIG.name}'...`);
    const createResponse = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION_CONFIG.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.QDRANT_API_KEY && { 'api-key': process.env.QDRANT_API_KEY })
      },
      body: JSON.stringify({
        vectors: {
          size: COLLECTION_CONFIG.vectorSize,
          distance: COLLECTION_CONFIG.distance
        }
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create collection: ${createResponse.status} ${error}`);
    }

    console.log(`Collection '${COLLECTION_CONFIG.name}' created successfully`);
  } catch (error: any) {
    console.error('Error ensuring collection exists:', error);
    throw error;
  }
}

export async function testQdrantConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.QDRANT_URL}/healthz`, {
      headers: {
        ...(process.env.QDRANT_API_KEY && { 'api-key': process.env.QDRANT_API_KEY })
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Qdrant connection test failed:', error);
    return false;
  }
}

export async function getCollectionInfo(): Promise<any> {
  try {
    const response = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION_CONFIG.name}`, {
      headers: {
        ...(process.env.QDRANT_API_KEY && { 'api-key': process.env.QDRANT_API_KEY })
      }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error: any) {
    console.warn('Could not get collection info:', error.message);
  }

  return null;
}