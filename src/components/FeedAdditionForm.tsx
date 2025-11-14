'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { rssService } from '@/services/rssService'
import { contentService } from '@/services/database/contentService'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const feedSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    }),
  category: z.string().optional(),
})

type FeedFormData = z.infer<typeof feedSchema>

interface FeedAdditionFormProps {
  userId: string
  onFeedAdded?: () => void
}

export function FeedAdditionForm({
  userId,
  onFeedAdded,
}: FeedAdditionFormProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    feedTitle?: string
    feedDescription?: string
    error?: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load categories on component mount
  useEffect(() => {
    const defaultCategories = [
      'Technology',
      'News',
      'Blog',
      'Personal',
      'Business',
      'Entertainment',
      'Science',
      'Sports',
      'Health',
      'Education',
    ]

    const savedCategories = localStorage.getItem(`user-${userId}-categories`)
    if (savedCategories) {
      try {
        const userCategories = JSON.parse(savedCategories)
        setCategories([...defaultCategories, ...userCategories])
      } catch (error) {
        console.error('Error loading user categories:', error)
        setCategories(defaultCategories)
      }
    } else {
      setCategories(defaultCategories)
    }
  }, [userId])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FeedFormData>({
    resolver: zodResolver(feedSchema),
  })

  const urlValue = watch('url')

  const validateFeed = async () => {
    if (!urlValue || errors.url) return

    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await rssService.validateFeed(urlValue)
      setValidationResult(result)
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: 'Failed to validate feed. Please try again.',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const onSubmit = async (data: FeedFormData) => {
    if (!validationResult?.isValid) return

    setIsSubmitting(true)

    try {
      await contentService.addFeed({
        userId,
        url: data.url,
        category: data.category || undefined,
        title: validationResult.feedTitle,
        description: validationResult.feedDescription,
      })

      // Reset form and state
      reset()
      setValidationResult(null)
      onFeedAdded?.()
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        setValidationResult({
          isValid: false,
          error: 'This feed has already been added.',
        })
      } else {
        setValidationResult({
          isValid: false,
          error: 'Failed to add feed. Please try again.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Add RSS Feed</CardTitle>
        <CardDescription>
          Enter the URL of an RSS feed to add it to your content sources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              RSS Feed URL
            </label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/feed.xml"
                {...register('url')}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={validateFeed}
                disabled={!urlValue || !!errors.url || isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
            {errors.url && (
              <p className="text-sm text-red-600">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category (Optional)
            </label>
            <Select
              id="category"
              placeholder="Select a category"
              options={[
                { value: '', label: 'No category' },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
              {...register('category')}
            />
          </div>

          {validationResult && (
            <div
              className={`p-4 rounded-lg border ${
                validationResult.isValid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {validationResult.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  {validationResult.isValid ? (
                    <div>
                      <h4 className="font-medium text-green-800">
                        Valid RSS Feed
                      </h4>
                      {validationResult.feedTitle && (
                        <p className="text-sm text-green-700 mt-1">
                          <strong>Title:</strong> {validationResult.feedTitle}
                        </p>
                      )}
                      {validationResult.feedDescription && (
                        <p className="text-sm text-green-700">
                          <strong>Description:</strong>{' '}
                          {validationResult.feedDescription}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-red-800">
                        Validation Failed
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        {validationResult.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!validationResult?.isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Feed...
                </>
              ) : (
                'Add Feed'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setValidationResult(null)
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
