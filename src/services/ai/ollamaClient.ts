import { ChatOllama } from '@langchain/ollama'

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export class OllamaClient {
  private client: ChatOllama | null = null
  private modelName: string
  private availableModels: OllamaModel[] = []

  constructor(modelName?: string) {
    this.modelName = modelName || ''
  }

  async initialize(): Promise<void> {
    try {
      // Fetch available models if not specified
      if (!this.modelName) {
        await this.fetchAvailableModels()
        this.modelName = this.selectBestModel()
      }

      const isCloudModel = this.modelName.includes(':cloud')
      const apiKey = isCloudModel ? process.env.OLLAMA_CLOUD_API_KEY : undefined

      this.client = new ChatOllama({
        model: this.modelName,
        temperature: 0.7,
        maxRetries: 3,
        baseUrl: 'http://127.0.0.1:11434',
        ...(apiKey && { apiKey }),
      })

      // Test connection
      await this.testConnection()
    } catch (error) {
      throw new Error(`Failed to initialize Ollama client: ${error}`)
    }
  }

  private async fetchAvailableModels(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      const data = await response.json()
      this.availableModels = data.models || []
    } catch (error) {
      console.warn('Failed to fetch available models:', error)
      // Fallback to common models
      this.availableModels = [
        { name: 'llama2:7b', size: 0, modified_at: '' },
        { name: 'llama2:13b', size: 0, modified_at: '' },
        { name: 'codellama:7b', size: 0, modified_at: '' },
        { name: 'mistral:7b', size: 0, modified_at: '' }
      ]
    }
  }

  private selectBestModel(): string {
    if (this.availableModels.length === 0) {
      return 'llama2:7b' // Ultimate fallback
    }

    // Separate local and cloud models
    const localModels = this.availableModels.filter(model => !model.name.includes(':cloud'))
    const cloudModels = this.availableModels.filter(model => model.name.includes(':cloud'))

    // Prefer local models over cloud models
    const candidates = localModels.length > 0 ? localModels : cloudModels

    // Prefer models that are likely to be good for text generation
    const preferredModels = [
      'llama3.2:3b',
      'llama2:13b',
      'llama2:7b',
      'mistral:7b',
      'codellama:7b',
      'llama3:8b',
      'llama3:7b',
      'deepseek-r1:latest'
    ]

    for (const preferred of preferredModels) {
      const found = candidates.find(model => model.name === preferred)
      if (found) {
        return preferred
      }
    }

    // Return the first available candidate
    return candidates[0].name
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      const response = await this.client.invoke('Hello')
      return !!response.content
    } catch (error) {
      throw new Error(`Ollama connection test failed: ${error}`)
    }
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      const response = await this.client.invoke(prompt)
      return response.content as string
    } catch (error) {
      throw new Error(`Content generation failed: ${error}`)
    }
  }

  async generateBlogPost(topic: string, style: string = 'professional'): Promise<string> {
    const prompt = `Write a short blog post about "${topic}" in a ${style} style.`

    return this.generateContent(prompt)
  }

  async summarizeContent(content: string): Promise<string> {
    const prompt = `Summarize the following content in 3-5 key points:

${content}

Provide a concise summary that captures the main ideas.`

    return this.generateContent(prompt)
  }

  getModelName(): string {
    return this.modelName
  }

  getAvailableModels(): OllamaModel[] {
    return this.availableModels
  }

  isInitialized(): boolean {
    return this.client !== null
  }
}