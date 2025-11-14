import { OllamaClient } from '../../src/services/ai/ollamaClient'

// Mock the ChatOllama class
jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: 'Mock AI response',
      response_metadata: {},
      id: 'mock-message-id',
      tool_calls: [],
      invalid_tool_calls: [],
      usage_metadata: {}
    })
  }))
}))

describe('OllamaClient', () => {
  let client: OllamaClient

  beforeEach(() => {
    client = new OllamaClient('llama2:7b')
  })

  it('should initialize successfully', async () => {
    await expect(client.initialize()).resolves.toBeUndefined()
    expect(client.isInitialized()).toBe(true)
  })

  it('should generate content', async () => {
    await client.initialize()
    const result = await client.generateContent('Test prompt')
    expect(result).toBe('Mock AI response')
  })

  it('should generate blog post', async () => {
    await client.initialize()
    const result = await client.generateBlogPost('Test Topic')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should summarize content', async () => {
    await client.initialize()
    const result = await client.summarizeContent('Long content to summarize')
    expect(typeof result).toBe('string')
  })

  it('should return model name', () => {
    expect(client.getModelName()).toBe('llama2:7b')
  })

  it('should throw error when not initialized', async () => {
    await expect(client.generateContent('test')).rejects.toThrow('Client not initialized')
  })
})