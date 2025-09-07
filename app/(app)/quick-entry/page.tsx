'use client'

import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import QuickEntryForm from '@/components/quick-entry/QuickEntryForm'

interface QcLimits {
  mean: number | string
  sd: number | string  
  cv?: number | string
}

interface Selection {
  deviceId: string
  testId: string
  levelId: string
  lotId: string
}

function QuickEntryUnified() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize state from URL parameters
  const [selection, setSelection] = useState<Selection | null>(() => {
    const deviceId = searchParams.get('deviceId')
    const testId = searchParams.get('testId')
    const levelId = searchParams.get('levelId')
    const lotId = searchParams.get('lotId')
    
    if (deviceId && testId && levelId && lotId) {
      return { deviceId, testId, levelId, lotId }
    }
    return null
  })
  
  const [limits, setLimits] = useState<QcLimits | null>(null)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    
    if (fromParam && toParam) {
      return { from: fromParam, to: toParam }
    }
    
    // Default to last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    }
  })

  // Update URL when state changes
  const updateURL = useCallback((newSelection: Selection | null, newDateRange?: { from: string; to: string }) => {
    const params = new URLSearchParams()
    
    if (newSelection) {
      params.set('deviceId', newSelection.deviceId)
      params.set('testId', newSelection.testId)
      params.set('levelId', newSelection.levelId)
      params.set('lotId', newSelection.lotId)
    }
    
    const range = newDateRange || dateRange
    params.set('from', range.from)
    params.set('to', range.to)
    
    const paramString = params.toString()
    const newURL = paramString ? `?${paramString}` : '/quick-entry'
    
    router.replace(newURL, { scroll: false })
  }, [router, dateRange])

  const handleSelectionChange = useCallback((newSelection: Selection) => {
    setSelection(newSelection)
    updateURL(newSelection)
  }, [updateURL])

  const handleLimitsChange = useCallback((newLimits: QcLimits | null) => {
    setLimits(newLimits)
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quick Entry - Nhập QC nhanh</h1>
        <p className="text-gray-600 mt-1">
          Giao diện nhập liệu QC tối ưu với tính toán và đánh giá tự động
        </p>
      </div>

      {/* QC Limits Info */}
      {limits && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Giới hạn QC hiện tại</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Mean:</span>
              <span className="ml-2 font-mono">{Number(limits.mean).toFixed(2)}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">SD:</span>
              <span className="ml-2 font-mono">{Number(limits.sd).toFixed(3)}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">CV:</span>
              <span className="ml-2 font-mono">{limits.cv ? `${Number(limits.cv).toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Range:</span>
              <span className="ml-2 font-mono">
                {(Number(limits.mean) - 3 * Number(limits.sd)).toFixed(2)} - {(Number(limits.mean) + 3 * Number(limits.sd)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Entry Form */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <QuickEntryForm
          onSelectionChange={handleSelectionChange}
          onLimitsChange={handleLimitsChange}
        />
      </div>
    </div>
  )
}

function QuickEntryWithSuspense() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quick Entry - Nhập QC nhanh</h1>
        <p className="text-gray-600 mt-1">Đang tải...</p>
      </div>
    </div>}>
      <QuickEntryUnified />
    </Suspense>
  )
}

export default QuickEntryWithSuspense

