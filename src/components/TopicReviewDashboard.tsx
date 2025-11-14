'use client'

import React, { useEffect, useState } from 'react'
import { useApprovalStore } from '@/stores/approvalStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Filter,
  Search,
} from 'lucide-react'

const TopicReviewDashboard: React.FC = () => {
  const {
    topics,
    selectedTopicIds,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    priorityFilter,
    categoryFilter,
    fetchTopics,
    approveTopic,
    rejectTopic,
    updatePriority,
    bulkApprove,
    bulkReject,
    bulkUpdatePriority,
    selectTopic,
    deselectTopic,
    selectAllTopics,
    clearSelection,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setCategoryFilter,
  } = useApprovalStore()

  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingBulkAction, setPendingBulkAction] = useState<
    (() => void) | null
  >(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Filter topics based on current filters
  const filteredTopics = topics.filter((topic) => {
    const matchesSearch =
      !searchQuery ||
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || topic.approvalStatus === statusFilter
    const matchesPriority =
      priorityFilter === 'all' || topic.priority === priorityFilter
    const matchesCategory = !categoryFilter || topic.category === categoryFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const handleBulkApprove = () => {
    if (selectedTopicIds.length > 0) {
      setConfirmMessage(
        `Are you sure you want to approve ${selectedTopicIds.length} topic${selectedTopicIds.length !== 1 ? 's' : ''}?`
      )
      setPendingBulkAction(() => async () => {
        await bulkApprove(selectedTopicIds)
        setShowConfirmDialog(false)
        setPendingBulkAction(null)
      })
      setShowConfirmDialog(true)
    }
  }

  const handleBulkReject = () => {
    if (selectedTopicIds.length > 0) {
      setConfirmMessage(
        `Are you sure you want to reject ${selectedTopicIds.length} topic${selectedTopicIds.length !== 1 ? 's' : ''}?`
      )
      setPendingBulkAction(() => async () => {
        await bulkReject(selectedTopicIds)
        setShowConfirmDialog(false)
        setPendingBulkAction(null)
      })
      setShowConfirmDialog(true)
    }
  }

  const handleConfirmAction = () => {
    if (pendingBulkAction) {
      pendingBulkAction()
    }
  }

  const handleCancelAction = () => {
    setShowConfirmDialog(false)
    setPendingBulkAction(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        )
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="default">Medium</Badge>
      case 'low':
        return <Badge variant="outline">Low</Badge>
      default:
        return <Badge variant="outline">Medium</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading topics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Topic Review Dashboard</h1>
        <div className="text-sm text-gray-500">
          {filteredTopics.length} of {topics.length} topics
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | 'pending' | 'approved' | 'rejected'
                )
              }
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              placeholder="Filter by status"
            />

            <Select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value as 'all' | 'high' | 'medium' | 'low'
                )
              }
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              placeholder="Filter by priority"
            />

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                // Categories would be populated dynamically
              ]}
              placeholder="Filter by category"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTopicIds.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {selectedTopicIds.length} topic
                {selectedTopicIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Button variant="default" size="sm" onClick={handleBulkApprove}>
                  Approve Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkReject}
                >
                  Reject Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCancelAction}>
                Cancel
              </Button>
              <Button onClick={handleConfirmAction}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      {/* Topics List */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => (
          <Card key={topic.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.includes(topic.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectTopic(topic.id)
                        } else {
                          deselectTopic(topic.id)
                        }
                      }}
                      className="rounded"
                    />
                    <h3 className="text-lg font-semibold">{topic.name}</h3>
                    {getStatusIcon(topic.approvalStatus)}
                    {getStatusBadge(topic.approvalStatus)}
                    {getPriorityBadge(topic.priority)}
                  </div>

                  {topic.description && (
                    <p className="text-gray-600 mb-3">{topic.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trend Score:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {topic.trendScore.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Velocity:</span>
                      {topic.velocity.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Momentum:</span>
                      {topic.momentum.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Frequency:</span>
                      {topic.frequency}
                    </div>
                  </div>

                  {topic.angles && topic.angles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Content Angles:</h4>
                      <div className="space-y-2">
                        {topic.angles.slice(0, 3).map((angle, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-3 rounded text-sm"
                          >
                            <div className="font-medium">{angle.title}</div>
                            <div className="text-gray-600">
                              {angle.description}
                            </div>
                            <div className="flex gap-4 mt-1 text-xs">
                              <span>
                                Uniqueness:{' '}
                                {(angle.uniquenessScore * 100).toFixed(0)}%
                              </span>
                              <span>
                                SEO: {(angle.seoPotential * 100).toFixed(0)}%
                              </span>
                              <span>
                                Engagement:{' '}
                                {(angle.engagementPotential * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                        {topic.angles.length > 3 && (
                          <div className="text-sm text-gray-500">
                            +{topic.angles.length - 3} more angles
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Select
                    value={topic.priority}
                    onChange={(e) =>
                      updatePriority(
                        topic.id,
                        e.target.value as 'high' | 'medium' | 'low'
                      )
                    }
                    options={[
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                    className="w-24"
                  />

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveTopic(topic.id)}
                      disabled={topic.approvalStatus === 'approved'}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectTopic(topic.id)}
                      disabled={topic.approvalStatus === 'rejected'}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No topics match the current filters.
          </div>
        </div>
      )}
    </div>
  )
}

export default TopicReviewDashboard
