import { ChatOllama } from '@langchain/ollama'

export class OllamaClient {
  private client: ChatOllama | null = null
  private modelName: string

  constructor(modelName: string = 'llama2:7b') {
    this.modelName = modelName
  }

  async initialize(): Promise<void> {
    try {
      this.client = new ChatOllama({
        model: this.modelName,
        temperature: 0.7,
        maxRetries: 3,
      })

      // Test connection
      await this.testConnection()
    } catch (error) {
      throw new Error(`Failed to initialize Ollama client: ${error}`)
    }
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
    const prompt = `Write a comprehensive blog post about "${topic}" in a ${style} style.
    Include an engaging introduction, main content with multiple sections, and a conclusion.
    Make it informative and well-structured.`

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

  isInitialized(): boolean {
    return this.client !== null
  }
}