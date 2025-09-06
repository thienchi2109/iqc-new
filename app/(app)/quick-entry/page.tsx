'use client'

import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import QuickEntryForm from '@/components/quick-entry/QuickEntryForm'
import { LeveyJenningsChart } from '@/components/lj/LeveyJenningsChart'
import type { QcRun, QcLimits } from '@/components/lj/LeveyJenningsChart'
import { useGhostPoints, GhostPoint } from '@/components/lj/useGhostPoints'

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
  
  // Manual ghost points management (replacing useGhostPoints hook)
  const [ghostPoints, setGhostPoints] = useState<{[levelId: string]: GhostPoint}>({})
  
  // Create clearGhost function
  const clearGhost = useCallback((levelId: string) => {
    setGhostPoints(prev => {
      const newState = { ...prev }
      delete newState[levelId]
      return newState
    })
  }, [])
  
  // Create getAllGhosts function to match the hook interface
  const getAllGhosts = useCallback(() => {
    return Object.values(ghostPoints)
  }, [ghostPoints])

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

  // Fetch historical QC runs for the chart
  const { data: qcRuns = [], isLoading: runsLoading } = useQuery<QcRun[]>({
    queryKey: ['qc-runs', selection?.deviceId, selection?.testId, selection?.levelId, selection?.lotId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!selection) return []
      const params = new URLSearchParams({
        deviceId: selection.deviceId,
        testId: selection.testId,
        levelId: selection.levelId,
        lotId: selection.lotId,
        from: dateRange.from,
        to: dateRange.to,
        limit: '100', // Last 100 runs
      })
      const response = await fetch(`/api/qc/runs?${params}`)
      if (!response.ok) return []
      return response.json()
    },
    enabled: !!(selection?.deviceId && selection?.testId && selection?.levelId && selection?.lotId),
  })

  const handleGhostPointChange = useCallback((levelId: string, ghostPoint: GhostPoint | null) => {
    if (ghostPoint) {
      // Use the pre-calculated ghost point directly instead of recalculating
      setGhostPoints(prev => ({
        ...prev,
        [levelId]: ghostPoint,
      }))
    } else {
      clearGhost(levelId)
    }
  }, [clearGhost])

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
          Giao diện nhập liệu QC tối ưu với xem trước biểu đồ L-J trực tiếp
        </p>
      </div>

      {/* Row 1: Quick Entry Form */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <QuickEntryForm
          onGhostPointChange={handleGhostPointChange}
          onSelectionChange={handleSelectionChange}
          onLimitsChange={handleLimitsChange}
        />
      </div>

      {/* Row 2: Full-width L-J Chart Preview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="h-[520px]">
          <LeveyJenningsChart
            limits={limits ? { mean: limits.mean, sd: limits.sd } : undefined}
            runs={qcRuns}
            title="Biểu đồ Levey-Jennings - Xem trước trực tiếp"
            className="h-full"
            height={520}
          />
        </div>
      </div>

      {/* Ghost Points Summary */}
      {getAllGhosts().length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Điểm tạm thời hiện tại:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getAllGhosts().map((ghost, index) => (
              <div key={ghost.levelId} className="text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full border-2 border-dashed"
                    style={{ borderColor: ghost.color }}
                  ></div>
                  <span className="font-medium">Mức {index + 1}:</span>
                  <span>{ghost.value.toFixed(3)}</span>
                  <span className="text-gray-500">(Z: {ghost.z.toFixed(3)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

