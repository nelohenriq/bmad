'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Badge } from './ui/badge'
import { Plus, X, Edit2, Trash2, Check, X as XIcon } from 'lucide-react'

const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Category name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
})

type CategoryFormData = z.infer<typeof categorySchema>

// Default categories that will be available to all users
const DEFAULT_CATEGORIES = [
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

interface CategoryManagementProps {
  userId: string
  onCategoriesChange?: (categories: string[]) => void
}

export function CategoryManagement({
  userId,
  onCategoriesChange,
}: CategoryManagementProps) {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  // Load user categories from localStorage (in a real app, this would come from the database)
  useEffect(() => {
    const savedCategories = localStorage.getItem(`user-${userId}-categories`)
    if (savedCategories) {
      try {
        const userCategories = JSON.parse(savedCategories)
        setCategories([...DEFAULT_CATEGORIES, ...userCategories])
      } catch (error) {
        console.error('Error loading user categories:', error)
      }
    }
  }, [userId])

  // Save categories to localStorage and notify parent
  const saveCategories = (newCategories: string[]) => {
    const userCategories = newCategories.filter(
      (cat) => !DEFAULT_CATEGORIES.includes(cat)
    )
    localStorage.setItem(
      `user-${userId}-categories`,
      JSON.stringify(userCategories)
    )
    setCategories(newCategories)
    onCategoriesChange?.(newCategories)
  }

  const addCategory = (data: CategoryFormData) => {
    const categoryName = data.name.trim()

    if (categories.includes(categoryName)) {
      // Could show an error here, but for now just ignore duplicates
      reset()
      setIsAddingCategory(false)
      return
    }

    const newCategories = [...categories, categoryName]
    saveCategories(newCategories)
    reset()
    setIsAddingCategory(false)
  }

  const removeCategory = (categoryToRemove: string) => {
    // Don't allow removing default categories
    if (DEFAULT_CATEGORIES.includes(categoryToRemove)) {
      return
    }

    if (
      confirm(
        `Are you sure you want to delete the category "${categoryToRemove}"?`
      )
    ) {
      const newCategories = categories.filter((cat) => cat !== categoryToRemove)
      saveCategories(newCategories)
    }
  }

  const startEditingCategory = (category: string) => {
    setEditingCategory(category)
    setValue('name', category)
  }

  const cancelEditing = () => {
    setEditingCategory(null)
    reset()
  }

  const saveEditedCategory = (data: CategoryFormData) => {
    const newName = data.name.trim()

    if (newName === editingCategory) {
      cancelEditing()
      return
    }

    if (categories.includes(newName)) {
      // Could show an error here
      return
    }

    const newCategories = categories.map((cat) =>
      cat === editingCategory ? newName : cat
    )
    saveCategories(newCategories)
    cancelEditing()
  }

  const isDefaultCategory = (category: string) =>
    DEFAULT_CATEGORIES.includes(category)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manage Categories</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCategory(true)}
            disabled={isAddingCategory}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </CardTitle>
        <CardDescription>
          Organize your RSS feeds with custom categories. Default categories
          cannot be deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category form */}
        {isAddingCategory && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <form onSubmit={handleSubmit(addCategory)} className="flex gap-2">
              <Input
                {...register('name')}
                placeholder="Enter category name"
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="sm">
                <Check className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingCategory(false)
                  reset()
                }}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </form>
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>
        )}

        {/* Categories list */}
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              {editingCategory === category ? (
                // Edit mode
                <form
                  onSubmit={handleSubmit(saveEditedCategory)}
                  className="flex items-center gap-2 flex-1"
                >
                  <Input {...register('name')} className="flex-1" autoFocus />
                  <Button type="submit" size="sm" variant="outline">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                // Display mode
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category}</span>
                    {isDefaultCategory(category) && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingCategory(category)}
                      disabled={isDefaultCategory(category)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(category)}
                      disabled={isDefaultCategory(category)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No categories available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
