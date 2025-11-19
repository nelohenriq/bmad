import { z } from 'zod'

export const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  style: z.string().default('professional'),
  length: z.string().default('medium'),
  model: z.string().default('llama2:7b'),
  prompt: z.string().optional(),
  sources: z.array(z.object({
    url: z.string().url('Invalid source URL'),
    title: z.string().optional(),
    relevance: z.number().min(0).max(1).optional(),
  })).optional(),
})

export const updateFeedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  updateFrequency: z.enum(['manual', 'hourly', 'daily', 'weekly']).optional(),
  keywordFilters: z.array(z.string().max(100)).max(50).optional(),
  contentFilters: z.record(z.boolean()).optional(),
})

export const createFeedSchema = z.object({
  url: z.string().url('Invalid feed URL'),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateFeedInput = z.infer<typeof updateFeedSchema>
export type CreateFeedInput = z.infer<typeof createFeedSchema>
