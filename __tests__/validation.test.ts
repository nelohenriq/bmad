import { createContentSchema, updateFeedSchema } from '../src/lib/validations/schema'

describe('Validation Schemas', () => {
  describe('createContentSchema', () => {
    it('should validate valid content data', () => {
      const validData = {
        title: 'Test Title',
        content: 'Test Content',
        style: 'professional',
        length: 'medium',
        model: 'llama2:7b',
      }
      const result = createContentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should fail on missing title', () => {
      const invalidData = {
        content: 'Test Content',
      }
      const result = createContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate sources URL', () => {
      const dataWithInvalidSource = {
        title: 'Test',
        content: 'Test',
        sources: [{ url: 'not-a-url' }]
      }
      const result = createContentSchema.safeParse(dataWithInvalidSource)
      expect(result.success).toBe(false)
    })
  })
})
