'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckIcon, XIcon, LoaderIcon } from 'lucide-react'

interface BulkToolbarProps {
  selectedCount: number
  onBulkApprove: () => void
  onBulkReject: () => void
  isLoading?: boolean
}

export function BulkToolbar({ 
  selectedCount, 
  onBulkApprove, 
  onBulkReject, 
  isLoading = false 
}: BulkToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4 flex items-center gap-4 backdrop-blur-sm">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
          Đã chọn {selectedCount} mục
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onBulkApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all hover:shadow-md"
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckIcon className="h-4 w-4 mr-2" />
            )}
            Duyệt hàng loạt
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onBulkReject}
            disabled={isLoading}
            className="shadow-sm transition-all hover:shadow-md"
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XIcon className="h-4 w-4 mr-2" />
            )}
            Từ chối hàng loạt
          </Button>
        </div>
      </div>
    </div>
  )
}
