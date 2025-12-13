'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react'

interface UserFeedbackProps {
  operationId: string
  operationType: 'generation' | 'retrieval' | 'search'
  onFeedbackSubmitted?: (rating: number, feedback?: string, categories?: string[]) => void
  className?: string
}

export const UserFeedback: React.FC<UserFeedbackProps> = ({
  operationId,
  operationType,
  onFeedbackSubmitted,
  className = ''
}) => {
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const feedbackCategories = {
    generation: [
      'Accurate information',
      'Well-written',
      'Relevant to query',
      'Helpful context',
      'Clear explanations',
      'Too verbose',
      'Inaccurate information',
      'Poor writing quality',
      'Irrelevant content',
      'Confusing explanations'
    ],
    retrieval: [
      'Relevant sources',
      'Diverse perspectives',
      'Recent information',
      'Authoritative sources',
      'Comprehensive coverage',
      'Irrelevant sources',
      'Outdated information',
      'Biased sources',
      'Incomplete coverage',
      'Poor source quality'
    ],
    search: [
      'Fast results',
      'Accurate matches',
      'Good ranking',
      'Clear summaries',
      'Easy to understand',
      'Slow performance',
      'Irrelevant results',
      'Poor ranking',
      'Confusing summaries',
      'Hard to understand'
    ]
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleSubmit = async () => {
    if (rating === 0 || isSubmitting) return

    setIsSubmitting(true)

    try {
      // In a real implementation, this would call an API
      // For now, we'll just simulate the submission
      await new Promise(resolve => setTimeout(resolve, 500))

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(rating, feedback || undefined, selectedCategories)
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-400'
              } transition-colors`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
        </span>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <ThumbsUp className="w-5 h-5" />
            <span className="font-medium">Thank you for your feedback!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Your input helps us improve the {operationType} experience.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          How was your {operationType} experience?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating
          </label>
          {renderStars()}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What did you think? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {feedbackCategories[operationType].map((category) => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Feedback Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={`Tell us more about your ${operationType} experience...`}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="min-w-24"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>

        {/* Helper Text */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <p>
            Your feedback helps us improve the quality of {operationType} results.
            All responses are anonymous and used only for product improvement.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick feedback component for simple thumbs up/down
interface QuickFeedbackProps {
  operationId: string
  operationType: 'generation' | 'retrieval' | 'search'
  onFeedback?: (positive: boolean) => void
  className?: string
}

export const QuickFeedback: React.FC<QuickFeedbackProps> = ({
  operationId,
  operationType,
  onFeedback,
  className = ''
}) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)

  const handleFeedback = (positive: boolean) => {
    setFeedback(positive ? 'positive' : 'negative')
    if (onFeedback) {
      onFeedback(positive)
    }
  }

  if (feedback) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <span>Thanks for your feedback!</span>
        {feedback === 'positive' ? (
          <ThumbsUp className="w-4 h-4 text-green-600" />
        ) : (
          <ThumbsDown className="w-4 h-4 text-red-600" />
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 mr-2">Was this helpful?</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFeedback(true)}
        className="h-8 px-2"
      >
        <ThumbsUp className="w-3 h-3 mr-1" />
        Yes
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleFeedback(false)}
        className="h-8 px-2"
      >
        <ThumbsDown className="w-3 h-3 mr-1" />
        No
      </Button>
    </div>
  )
}