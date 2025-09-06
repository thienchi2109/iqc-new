'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QuickEntryForm from '@/components/quick-entry/QuickEntryForm'
import LjPanel, { QcRun, QcLimits } from '@/components/lj/LjPanel'
import { useGhostPoints, GhostPoint } from '@/components/lj/useGhostPoints'

interface Selection {
  deviceId: string
  testId: string
  levelId: string
  lotId: string
}

export default function QuickEntryUnified() {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [limits, setLimits] = useState<QcLimits | null>(null)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    }
  })
  const { ghostPoints, addGhost, clearGhost, getAllGhosts, getRFourSHint } = useGhostPoints()

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

  const handleGhostPointChange = (levelId: string, ghostPoint: GhostPoint | null) => {
    if (ghostPoint) {
      addGhost(levelId, ghostPoint.value, limits?.mean || 0, limits?.sd || 1)
    } else {
      clearGhost(levelId)
    }
  }

  const handleSelectionChange = (newSelection: Selection) => {
    setSelection(newSelection)
  }

  const handleLimitsChange = (newLimits: QcLimits | null) => {
    setLimits(newLimits)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nhập kết quả QC với biểu đồ trực tiếp</h1>
        <p className="text-gray-600 mt-1">Nhập dữ liệu QC và xem ghost points trên biểu đồ Levey-Jennings theo thời gian thực</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left Column - Quick Entry Form (3/5 of width on xl screens) */}
        <div className="xl:col-span-3">
          <QuickEntryForm
            onGhostPointChange={handleGhostPointChange}
            onSelectionChange={handleSelectionChange}
            onLimitsChange={handleLimitsChange}
          />
        </div>

        {/* Right Column - Levey-Jennings Chart (2/5 of width on xl screens) */}
        <div className="xl:col-span-2">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                />
              </div>
            </div>
          </div>
          <LjPanel
            deviceId={selection?.deviceId}
            testId={selection?.testId}
            levelId={selection?.levelId}
            lotId={selection?.lotId}
            limits={limits || undefined}
            ghostPoints={getAllGhosts()}
            runs={qcRuns}
            isLoading={runsLoading}
            title="Biểu đồ Levey-Jennings - Xem trước trực tiếp"
          />
        </div>
      </div>

      {/* Ghost Points Summary */}
      {getAllGhosts().length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
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

