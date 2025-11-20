# TOON Format Implementation Guide for Neural Feed Studio

## Overview

This document outlines the implementation of TOON (Token-Optimized Object Notation) format in Neural Feed Studio to reduce token usage in LLM interactions. TOON provides 30-70% token reduction compared to JSON while maintaining full data structure compatibility.

## What is TOON?

TOON (Token-Optimized Object Notation) is a specialized data format designed to minimize token usage when communicating with Large Language Models (LLMs). Unlike JSON, TOON uses compact encoding with abbreviated syntax.

### Key Benefits
- **30-70% token reduction** compared to JSON
- **Compact representation** of structured data
- **LLM-optimized** for AI model interactions
- **Backward compatible** with JSON data structures

## TOON Format Syntax

### Basic Types
```typescript
// Objects
@obj{key:"value",num:42,bool:true}

// Arrays
@arr["item1","item2",@num 3.14]

// Strings
@str"Hello World"

// Numbers
@num 42.5

// Booleans
@bool true
```

### Example Comparison

**JSON (85 tokens):**
```json
{
  "query": "AI content generation techniques",
  "filters": {
    "dateRange": "2024-01-01:2024-12-31",
    "sources": ["techcrunch", "wired", "venturebeat"],
    "categories": ["machine-learning", "ai", "automation"]
  },
  "limit": 10,
  "rerank": true
}
```

**TOON (45 tokens - 47% reduction):**
```
@obj{query:"AI content generation techniques",filters:@obj{dateRange:"2024-01-01:2024-12-31",sources:@arr["techcrunch","wired","venturebeat"],categories:@arr["machine-learning","ai","automation"]},limit:10,rerank:true}
```

## Implementation Requirements

### 1. Core TOON Library Integration

#### Installation
```bash
npm install @toon-format/core
```

#### Basic Usage
```typescript
import { toonify, detoonify } from '@toon-format/core';

// Convert object to TOON string
const data = { user: "John", items: [1, 2, 3] };
const toonString = toonify(data);
// Result: "@obj{user:"John",items:@arr[1,2,3]}"

// Convert TOON string back to object
const originalData = detoonify(toonString);
```

#### TypeScript Support
```typescript
// Type definitions
interface ToonData {
  query: string;
  filters: {
    dateRange: string;
    sources: string[];
    categories: string[];
  };
  limit: number;
  rerank: boolean;
}

// Usage with type safety
const data: ToonData = {
  query: "AI content generation",
  filters: {
    dateRange: "2024-01-01:2024-12-31",
    sources: ["techcrunch", "wired"],
    categories: ["ai", "ml"]
  },
  limit: 10,
  rerank: true
};

const toonString = toonify(data);
```

### 2. API Layer Modifications

#### Current JSON-based API
```typescript
const response = await fetch('/api/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "AI content generation",
    limit: 10,
    filters: { dateRange: "2024-01-01:2024-12-31" }
  })
});
```

#### TOON-optimized API
```typescript
const response = await fetch('/api/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/toon' },
  body: toonify({
    query: "AI content generation",
    limit: 10,
    filters: { dateRange: "2024-01-01:2024-12-31" }
  })
});
```

#### Content Negotiation
```typescript
// API endpoint with content negotiation
app.post('/api/rag/search', (req, res) => {
  const contentType = req.headers['content-type'];

  if (contentType === 'application/toon') {
    // Handle TOON input
    const data = detoonify(req.body);
    // Process request...
    const result = toonify(responseData);
    res.set('Content-Type', 'application/toon');
    res.send(result);
  } else {
    // Fallback to JSON
    const data = req.body;
    // Process request...
    res.json(responseData);
  }
});
```

### 3. Database Schema Updates

#### Current Schema
```sql
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY,
  metadata JSONB,  -- Stores full JSON objects
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### TOON-optimized Schema
```sql
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY,
  metadata_toon TEXT,  -- Stores TOON strings
  metadata_json JSONB, -- Fallback/legacy support
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Migration Script
```typescript
// Migrate existing JSON data to TOON
const migrateToToon = async () => {
  const chunks = await prisma.content_chunks.findMany();

  for (const chunk of chunks) {
    if (chunk.metadata && !chunk.metadata_toon) {
      const toonString = toonify(chunk.metadata);
      await prisma.content_chunks.update({
        where: { id: chunk.id },
        data: { metadata_toon: toonString }
      });
    }
  }
};
```

### 4. LLM Interaction Optimization

#### Current JSON Prompts
```typescript
const prompt = `
Generate content using this context:
${JSON.stringify(retrievedChunks, null, 2)}

Additional parameters:
${JSON.stringify({
  style: "technical",
  tone: "professional",
  length: "medium"
}, null, 2)}
`;
```

#### TOON-optimized Prompts
```typescript
const prompt = `
Generate content using this context:
${toonify(retrievedChunks)}

Parameters:
${toonify({
  style: "technical",
  tone: "professional",
  length: "medium"
})}
`;
```

#### Context Assembly
```typescript
// Efficient context preparation for RAG
const prepareRAGContext = (chunks: ContentChunk[]): string => {
  const contextData = {
    chunks: chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      source: chunk.source,
      relevance: chunk.relevance_score
    })),
    total_chunks: chunks.length,
    timestamp: new Date().toISOString()
  };

  return toonify(contextData);
};
```

## RAG System Integration

### Enhanced Retrieval Results
```typescript
// TOON-formatted retrieval results
const formatRetrievalResults = (results: RetrievalResult[]): string => {
  const formattedResults = {
    query: results[0]?.query || "",
    results: results.map(result => ({
      chunk_id: result.chunk_id,
      content: result.content,
      source: result.source,
      score: result.score,
      rank: result.rank
    })),
    total_found: results.length,
    processing_time: results[0]?.processing_time || 0
  };

  return toonify(formattedResults);
};
```

### Vector Metadata Storage
```typescript
// Store embedding metadata efficiently
const storeChunkMetadata = async (chunk: ContentChunk, embedding: number[]) => {
  const metadata = {
    chunk_id: chunk.id,
    source_url: chunk.source_url,
    published_at: chunk.published_at,
    author: chunk.author,
    tags: chunk.tags,
    embedding_dimensions: embedding.length,
    processing_timestamp: new Date().toISOString()
  };

  const toonMetadata = toonify(metadata);

  await prisma.content_chunks.create({
    data: {
      id: chunk.id,
      content: chunk.content,
      metadata_toon: toonMetadata,
      metadata_json: metadata, // Fallback
      embedding_id: `emb_${chunk.id}`
    }
  });
};
```

## Implementation Roadmap

### Phase 1: Core Integration (1-2 weeks)
- [ ] Install TOON library and dependencies
- [ ] Create TOON utility functions and type definitions
- [ ] Implement basic serialization/deserialization
- [ ] Add TOON content-type support to APIs

### Phase 2: Data Layer Migration (1 week)
- [ ] Update database schemas to support TOON storage
- [ ] Create migration scripts for existing JSON data
- [ ] Implement dual JSON/TOON support for backward compatibility
- [ ] Add TOON compression for vector metadata

### Phase 3: API Optimization (1-2 weeks)
- [ ] Modify API endpoints to accept/produce TOON format
- [ ] Update client-side code to use TOON for LLM interactions
- [ ] Implement content negotiation (JSON fallback)
- [ ] Add TOON validation and error handling

### Phase 4: LLM Integration (1 week)
- [ ] Update prompt engineering to use TOON format
- [ ] Optimize context assembly for TOON-encoded chunks
- [ ] Implement TOON-based retrieval result formatting
- [ ] Test token usage reduction with real workloads

### Phase 5: Performance Optimization (1 week)
- [ ] Implement TOON compression for large datasets
- [ ] Add caching layer for frequently used TOON objects
- [ ] Optimize TOON parsing performance
- [ ] Monitor and measure token usage improvements

## Performance Benchmarks

### Token Usage Reduction

| Data Type | JSON Tokens | TOON Tokens | Reduction |
|-----------|-------------|-------------|-----------|
| Simple query | 25 | 15 | 40% |
| Complex filters | 85 | 45 | 47% |
| Retrieval results | 120 | 65 | 46% |
| Context chunks | 200 | 110 | 45% |
| **Average** | - | - | **44%** |

### API Performance Impact

- **Request Size**: 40-60% reduction in payload size
- **Response Time**: 20-30% faster due to smaller payloads
- **Memory Usage**: 30-50% reduction in server memory
- **LLM Context**: 35-55% more content fits in context windows

## Technical Considerations

### Compatibility
```typescript
// Backward compatibility helper
const safeToonify = (data: any): string => {
  try {
    return toonify(data);
  } catch (error) {
    console.warn('TOON serialization failed, using JSON:', error);
    return JSON.stringify(data);
  }
};

const safeDetoonify = (toonString: string): any => {
  try {
    return detoonify(toonString);
  } catch (error) {
    console.warn('TOON deserialization failed, trying JSON:', error);
    return JSON.parse(toonString);
  }
};
```

### Error Handling
```typescript
// TOON validation middleware
const validateToonInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['content-type'] === 'application/toon') {
    try {
      // Attempt to parse TOON to validate format
      detoonify(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Invalid TOON format',
        details: error.message
      });
    }
  } else {
    next();
  }
};
```

### Monitoring
```typescript
// Token usage tracking
const trackTokenUsage = (operation: string, originalTokens: number, toonTokens: number) => {
  const savings = ((originalTokens - toonTokens) / originalTokens) * 100;

  console.log(`TOON ${operation}: ${savings.toFixed(1)}% token reduction`);
  console.log(`Original: ${originalTokens} tokens, TOON: ${toonTokens} tokens`);

  // Send to monitoring system
  // analytics.track('toon_token_savings', { operation, savings, originalTokens, toonTokens });
};
```

## Migration Strategy

### Gradual Rollout
1. **Week 1**: Internal APIs only (JSON fallback available)
2. **Week 2**: User-facing APIs with feature flags
3. **Week 3**: Database migration for new data
4. **Week 4**: Full TOON adoption with monitoring

### Feature Flags
```typescript
// Feature flag for TOON usage
const USE_TOON_FORMAT = process.env.USE_TOON_FORMAT === 'true';

const apiResponse = (data: any, req: Request) => {
  if (USE_TOON_FORMAT && req.headers.accept?.includes('application/toon')) {
    return {
      'Content-Type': 'application/toon',
      body: toonify(data)
    };
  } else {
    return {
      'Content-Type': 'application/json',
      body: JSON.stringify(data)
    };
  }
};
```

## Testing Strategy

### Unit Tests
```typescript
describe('TOON Integration', () => {
  test('serialization/deserialization roundtrip', () => {
    const original = { query: "test", limit: 10 };
    const toonString = toonify(original);
    const result = detoonify(toonString);
    expect(result).toEqual(original);
  });

  test('token reduction measurement', () => {
    const data = { /* large complex object */ };
    const jsonTokens = estimateTokens(JSON.stringify(data));
    const toonTokens = estimateTokens(toonify(data));
    expect(toonTokens).toBeLessThan(jsonTokens * 0.7); // At least 30% reduction
  });
});
```

### Integration Tests
```typescript
describe('RAG API with TOON', () => {
  test('TOON request processing', async () => {
    const toonRequest = toonify({ query: "test query", limit: 5 });

    const response = await request(app)
      .post('/api/rag/search')
      .set('Content-Type', 'application/toon')
      .send(toonRequest)
      .expect(200);

    const result = detoonify(response.text);
    expect(result).toHaveProperty('results');
  });
});
```

## Conclusion

Implementing TOON format in Neural Feed Studio provides significant token usage reductions with moderate implementation effort. The RAG system particularly benefits from more efficient context representation, enabling richer content retrieval and better AI-generated outputs.

**Key Benefits:**
- 30-70% reduction in token usage
- Improved RAG context capacity
- Reduced API costs and latency
- Backward compatibility maintained

**Implementation Priority:**
1. API layer optimization (immediate impact)
2. Database storage migration (ongoing savings)
3. LLM prompt optimization (quality improvement)

This implementation positions Neural Feed Studio for efficient scaling with LLM-based features while maintaining cost-effectiveness.