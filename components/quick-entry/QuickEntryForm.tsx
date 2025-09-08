'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updateQcRunsCache, invalidateRelatedQueries } from '@/lib/query/qcRuns'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import SimpleSelect from '@/components/ui/SimpleSelect'
import { Button } from '@/components/ui/button'
import { GhostPoint } from '@/components/lj/useGhostPoints'
import RunHints from './RunHints'

interface User {
  id: string
  name: string
  username: string
  role: 'tech' | 'supervisor' | 'qaqc' | 'admin'
}

interface Device {
  id: string
  code: string
  name: string
}

interface Test {
  id: string
  code: string
  name: string
  defaultUnitId?: string
  defaultMethodId?: string
}

interface Unit {
  id: string
  code: string
  display: string
}

interface Method {
  id: string
  code: string
  name: string
}

interface QcLevel {
  id: string
  testId: string
  level: string
  material?: string
}

interface QcLot {
  id: string
  levelId: string
  lotCode: string
  expireDate: string
}

interface QcLimits {
  mean: number
  sd: number
  cv?: number
}

interface LevelEntry {
  levelId: string
  lotId: string
  value: string
  unitId: string
  methodId: string
  notes?: string
}

export interface QuickEntryFormProps {
  onSelectionChange?: (selection: {
    deviceId: string
    testId: string
    levelId: string
    lotId: string
  }) => void
  onLimitsChange?: (limits: QcLimits | null) => void
  className?: string
}

export function QuickEntryForm({
  onSelectionChange,
  onLimitsChange,
  className = '',
}: QuickEntryFormProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [deviceId, setDeviceId] = useState('')
  const [testId, setTestId] = useState('')
  const [performerId, setPerformerId] = useState(session?.user?.id || '')
  const [runAt, setRunAt] = useState(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localDate = new Date(now.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  })

  const [levels, setLevels] = useState<LevelEntry[]>([
    { levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' },
  ])

  // Update performerId when session changes
  useEffect(() => {
    if (session?.user?.id && !performerId) {
      setPerformerId(session.user.id)
    }
  }, [session?.user?.id, performerId])

  // Master data queries
  const { data: devices } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: () => fetch('/api/devices').then((res) => res.json()),
  })

  const { data: tests } = useQuery<Test[]>({
    queryKey: ['tests'],
    queryFn: () => fetch('/api/tests').then((res) => res.json()),
  })

  const { data: units } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => fetch('/api/units').then((res) => res.json()),
  })

  const { data: methods } = useQuery<Method[]>({
    queryKey: ['methods'],
    queryFn: () => fetch('/api/methods').then((res) => res.json()),
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((res) => res.json()),
    enabled: !!(session?.user?.role && ['supervisor', 'admin'].includes(session.user.role)),
  })

  // Dependent data
  const { data: qcLevels } = useQuery<QcLevel[]>({
    queryKey: ['qc-levels', testId],
    queryFn: () => fetch(`/api/qc/levels?testId=${testId}`).then((res) => res.json()),
    enabled: !!testId,
  })

  const { data: qcLots } = useQuery<QcLot[]>({
    queryKey: ['qc-lots', levels.map((l) => l.levelId).filter(Boolean)],
    queryFn: () => {
      const levelIds = levels.map((l) => l.levelId).filter(Boolean)
      if (levelIds.length === 0) return []
      return fetch(`/api/qc/lots?${levelIds.map((id) => `levelId=${id}`).join('&')}`).then((res) => res.json())
    },
    enabled: levels.some((l) => l.levelId),
  })

  // QC limits for ghost point calculation - more flexible approach
  const { data: qcLimits } = useQuery<QcLimits>({
    queryKey: ['qc-limits', deviceId, testId, levels[0]?.levelId, levels[0]?.lotId],
    queryFn: async () => {
      if (!deviceId || !testId || !levels[0]?.levelId) return null
      const params = new URLSearchParams({
        deviceId,
        testId,
        levelId: levels[0].levelId,
      })
      // Include lotId if available for more precise limits
      if (levels[0]?.lotId) {
        params.append('lotId', levels[0].lotId)
      }
      const response = await fetch(`/api/qc/limits?${params}`)
      if (!response.ok) return null
      const data = await response.json()
      return data[0] || null
    },
    enabled: !!(deviceId && testId && levels[0]?.levelId),
  })

  // Additional QC limits for other levels when they exist
  const { data: qcLimitsLevel2 } = useQuery<QcLimits>({
    queryKey: ['qc-limits', deviceId, testId, levels[1]?.levelId, levels[1]?.lotId],
    queryFn: async () => {
      if (!deviceId || !testId || !levels[1]?.levelId) return null
      const params = new URLSearchParams({
        deviceId,
        testId,
        levelId: levels[1].levelId,
      })
      if (levels[1]?.lotId) {
        params.append('lotId', levels[1].lotId)
      }
      const response = await fetch(`/api/qc/limits?${params}`)
      if (!response.ok) return null
      const data = await response.json()
      return data[0] || null
    },
    enabled: !!(deviceId && testId && levels[1]?.levelId),
  })

  const { data: qcLimitsLevel3 } = useQuery<QcLimits>({
    queryKey: ['qc-limits', deviceId, testId, levels[2]?.levelId, levels[2]?.lotId],
    queryFn: async () => {
      if (!deviceId || !testId || !levels[2]?.levelId) return null
      const params = new URLSearchParams({
        deviceId,
        testId,
        levelId: levels[2].levelId,
      })
      if (levels[2]?.lotId) {
        params.append('lotId', levels[2].lotId)
      }
      const response = await fetch(`/api/qc/limits?${params}`)
      if (!response.ok) return null
      const data = await response.json()
      return data[0] || null
    },
    enabled: !!(deviceId && testId && levels[2]?.levelId),
  })

  // Mutations
  const createRunGroupMutation = useMutation({
    mutationFn: async (data: { deviceId: string; testId: string; runAt: string }) => {
      const response = await fetch('/api/qc/run-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create run group')
      return response.json()
    },
  })

  const createQcRunMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/qc/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create QC run')
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Update cache with new QC run
      if (data.run) {
        // Convert API response to QcRun format
        const newRun = {
          id: data.run.id,
          groupId: data.run.groupId,
          deviceId: deviceId,
          testId: testId,
          levelId: variables.levelId,
          lotId: variables.lotId,
          value: variables.value,
          unit: units?.find(u => u.id === variables.unitId)?.display || '',
          method: methods?.find(m => m.id === variables.methodId)?.name || '',
          performer: users?.find(u => u.id === performerId)?.name || '',
          z: data.evaluation?.z || 0,
          side: data.evaluation?.side || 'on',
          status: data.evaluation?.status || 'accepted',
          autoResult: data.evaluation?.autoResult || 'accepted',
          runAt: new Date().toISOString(),
          createdAt: new Date(),
        }
        
        updateQcRunsCache(queryClient, newRun)
      }
      
      // Invalidate related queries
      invalidateRelatedQueries(queryClient)
    },
  })

  // Z-score calculation utility
  const computeZ = useCallback((value: number, mean: number, sd: number): number | null => {
    if (!sd || sd <= 0 || isNaN(value) || isNaN(mean)) return null
    return (value - mean) / sd
  }, [])

  // Determine color based on z-score thresholds
  const getColorForZ = useCallback((z: number): string => {
    const absZ = Math.abs(z)
    if (absZ > 3) return '#dc2626' // red-600 - 1-3s fail
    if (absZ > 2) return '#ea580c' // orange-600 - 1-2s warn
    if (absZ > 1) return '#d97706' // amber-600 - caution
    return '#16a34a' // green-600 - acceptable
  }, [])

  // Determine which side of mean the value falls on
  const getSideForZ = useCallback((z: number): 'above' | 'below' | 'on' => {
    if (z > 0.1) return 'above'
    if (z < -0.1) return 'below'
    return 'on'
  }, [])

  // Memoize updateLevel to prevent unnecessary re-renders
  const updateLevel = useCallback((index: number, field: keyof LevelEntry, value: string) => {
    setLevels(prev => {
      const newLevels = [...prev]
      newLevels[index] = { ...newLevels[index], [field]: value }
      return newLevels
    })
  }, [])

  // Handle value change and emit ghost point
  const handleValueChange = (index: number, value: string) => {
    setLevels(prev => {
      const newLevels = [...prev]
      newLevels[index] = { ...newLevels[index], value }
      return newLevels
    })
  }

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange && deviceId && testId && levels[0]?.levelId && levels[0]?.lotId) {
      onSelectionChange({
        deviceId,
        testId,
        levelId: levels[0].levelId,
        lotId: levels[0].lotId,
      })
    }
  }, [deviceId, testId, levels, onSelectionChange])

  // Notify parent of limits changes (use first level's limits as primary)
  useEffect(() => {
    if (onLimitsChange) {
      onLimitsChange(qcLimits || null)
    }
  }, [qcLimits, onLimitsChange])

  const selectedTest = tests?.find((t) => t.id === testId)

  const addLevel = () => {
    if (levels.length < 3) {
      setLevels([
        ...levels,
        {
          levelId: '',
          lotId: '',
          value: '',
          unitId: selectedTest?.defaultUnitId || '',
          methodId: selectedTest?.defaultMethodId || '',
          notes: '',
        },
      ])
    }
  }

  const removeLevel = (index: number) => {
    if (levels.length > 1) {
      setLevels(levels.filter((_, i) => i !== index))
    }
  }

  // Memoize ghost points calculation to prevent expensive re-calculations
  const ghostPointsForHints = useMemo(() => {
    const limitsMap = [qcLimits, qcLimitsLevel2, qcLimitsLevel3]
    
    return levels.map((level, index) => {
      if (!level.value || !level.levelId) return null
      const numericValue = parseFloat(level.value)
      if (isNaN(numericValue)) return null
      
      const levelLimits = limitsMap[index]
      if (!levelLimits) return null
      
      const z = computeZ(numericValue, levelLimits.mean, levelLimits.sd)
      if (z === null) return null
      
      return {
        levelId: level.levelId,
        value: numericValue,
        z,
        time: new Date(),
        color: getColorForZ(z),
        side: getSideForZ(z),
      } as GhostPoint
    }).filter(Boolean) as GhostPoint[]
  }, [levels, qcLimits, qcLimitsLevel2, qcLimitsLevel3, computeZ, getColorForZ, getSideForZ])

  const handleTestChange = (newTestId: string) => {
    setTestId(newTestId)
    const test = tests?.find((t) => t.id === newTestId)
    if (test) {
      setLevels(
        levels.map((level) => ({
          ...level,
          unitId: test.defaultUnitId || level.unitId,
          methodId: test.defaultMethodId || level.methodId,
        }))
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      const runGroup = await createRunGroupMutation.mutateAsync({ deviceId, testId, runAt })
      
      for (const level of levels) {
        if (level.levelId && level.value) {
          await createQcRunMutation.mutateAsync({
            groupId: runGroup.id,
            deviceId,
            testId,
            levelId: level.levelId,
            lotId: level.lotId,
            value: parseFloat(level.value),
            unitId: level.unitId,
            methodId: level.methodId,
            performerId: performerId,
            notes: level.notes,
          })
        }
      }

      // Reset form
      setDeviceId('')
      setTestId('')
      setPerformerId(session?.user?.id || '')
      setRunAt(() => {
        const now = new Date()
        const offset = now.getTimezoneOffset()
        const localDate = new Date(now.getTime() - offset * 60 * 1000)
        return localDate.toISOString().slice(0, 16)
      })
      setLevels([{ levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }])

      toast.success('Tạo lần chạy QC thành công!')
    } catch (error) {
      console.error('Lỗi khi tạo lần chạy QC:', error)
      toast.error('Lỗi khi tạo lần chạy QC. Vui lòng thử lại.')
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Nhập kết quả QC</h2>
        <p className="text-gray-600 mt-1">Nhập dữ liệu QC cho tối đa 3 mức trong một phiên</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- COLUMN 1: GENERAL INFO & HINTS --- */}
          <div className="space-y-6">
            {/* Run Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Thông tin chung</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thiết bị *</label>
                  <SimpleSelect
                    value={deviceId}
                    onChange={(value) => setDeviceId(value)}
                    options={devices?.map((device) => ({ value: device.id, label: `${device.code} - ${device.name}` })) || []}
                    placeholder="Chọn thiết bị"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Xét nghiệm *</label>
                  <SimpleSelect
                    value={testId}
                    onChange={(value) => handleTestChange(value)}
                    options={tests?.map((test) => ({ value: test.id, label: `${test.code} - ${test.name}` })) || []}
                    placeholder="Chọn xét nghiệm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Người thực hiện *</label>
                  {session?.user?.role === 'tech' ? (
                    <Input
                      value={session.user.name || session.user.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  ) : (
                    <SimpleSelect
                      value={performerId}
                      onChange={(value) => setPerformerId(value)}
                      options={(users as User[] | undefined)?.map((user) => ({ value: user.id, label: `${user.name} (${user.username})` })) || []}
                      placeholder="Chọn người thực hiện"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày/giờ chạy *</label>
                  <Input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* QC Limits Display */}
            {qcLimits && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Giới hạn QC hiện tại</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <span className="font-medium text-blue-700 block mb-1">Mean:</span> 
                    <span className="text-lg font-mono">{qcLimits.mean.toFixed(3)}</span>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="font-medium text-blue-700 block mb-1">SD:</span> 
                    <span className="text-lg font-mono">{qcLimits.sd.toFixed(3)}</span>
                  </div>
                  {qcLimits.cv && (
                    <div className="bg-white p-3 rounded border">
                      <span className="font-medium text-blue-700 block mb-1">CV:</span> 
                      <span className="text-lg font-mono">{qcLimits.cv.toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Westgard Hints */}
            <RunHints 
              ghostPoints={ghostPointsForHints}
              levels={levels}
            />
          </div>

          {/* --- COLUMN 2: QC LEVELS --- */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="text-lg font-medium text-gray-900">Mức QC</h3>
              {levels.length < 3 && (
                <Button type="button" onClick={addLevel} variant="outline" size="sm">
                  Thêm mức
                </Button>
              )}
            </div>

            {levels.map((level, index) => (
              <div key={index} className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden" data-level-card={`level-${index}`}>
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Mức {index + 1}</h4>
                  {levels.length > 1 && (
                    <Button type="button" onClick={() => removeLevel(index)} variant="destructive" size="sm">
                      Xóa
                    </Button>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {/* Primary fields - QC Level and Lot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mức QC *</label>
                      <SimpleSelect
                        value={level.levelId}
                        onChange={(value) => updateLevel(index, 'levelId', value)}
                        options={qcLevels?.map((qcLevel) => ({ value: qcLevel.id, label: `${qcLevel.level} - ${qcLevel.material}` })) || []}
                        placeholder="Chọn mức"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lô QC *</label>
                      <SimpleSelect
                        value={level.lotId}
                        onChange={(value) => updateLevel(index, 'lotId', value)}
                        options={
                          qcLots?.filter((lot) => lot.levelId === level.levelId).map((lot) => ({
                            value: lot.id,
                            label: `${lot.lotCode} (HSD: ${lot.expireDate})`,
                          })) || []
                        }
                        placeholder="Chọn lô"
                        disabled={!level.levelId}
                      />
                    </div>
                  </div>

                  {/* Value input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá trị *
                    </label>
                    <Input
                      type="text"
                      value={level.value}
                      onChange={(e) => {
                        const value = e.target.value
                        handleValueChange(index, value)
                      }}
                      placeholder="Nhập giá trị (ví dụ: 100.25)"
                      required
                      className="text-lg font-mono"
                      pattern="[0-9]*\.?[0-9]*"
                    />
                  </div>

                  {/* Secondary fields - Unit, Method, Notes with stable spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị *</label>
                        <SimpleSelect
                          value={level.unitId}
                          onChange={(value) => updateLevel(index, 'unitId', value)}
                          options={units?.map((unit) => ({ value: unit.id, label: unit.display })) || []}
                          placeholder="Chọn đơn vị"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phương pháp *</label>
                        <SimpleSelect
                          value={level.methodId}
                          onChange={(value) => updateLevel(index, 'methodId', value)}
                          options={methods?.map((method) => ({ value: method.id, label: method.name })) || []}
                          placeholder="Chọn phương pháp"
                        />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                        <Input
                          type="text"
                          value={level.notes || ''}
                          onChange={(e) => updateLevel(index, 'notes', e.target.value)}
                          placeholder="Ghi chú tùy chọn"
                        />
                    </div>
                </div>

                {/* Show Z-score and Westgard hint with stable layout */}
                <div className="bg-white border-t border-gray-200 p-4">
                  {(() => {
                    const limitsMap = [qcLimits, qcLimitsLevel2, qcLimitsLevel3]
                    const levelLimits = limitsMap[index]
                    
                    return levelLimits && level.value && !isNaN(parseFloat(level.value)) ? (
                      <>
                        <h5 className="font-medium text-gray-900 mb-2">Kết quả đánh giá</h5>
                        <div className="text-sm">
                          {(() => {
                            const z = computeZ(parseFloat(level.value), levelLimits.mean, levelLimits.sd)
                            if (z === null) return null
                            const absZ = Math.abs(z)
                            
                            if (absZ > 3) {
                              return (
                                <div className="flex items-center space-x-2 text-red-600">
                                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                                  <span className="font-medium">🚫 1-3s: Loại bỏ (|z| &gt; 3SD)</span>
                                </div>
                              )
                            } else if (absZ > 2) {
                              return (
                                <div className="flex items-center space-x-2 text-orange-600">
                                  <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                                  <span className="font-medium">⚠️ 1-2s: Cảnh báo (|z| &gt; 2SD)</span>
                                </div>
                              )
                            } else if (absZ > 1) {
                              return (
                                <div className="flex items-center space-x-2 text-yellow-600">
                                  <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                                  <span>💡 Chú ý (|z| &gt; 1SD)</span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center space-x-2 text-green-600">
                                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                                  <span>✅ Chấp nhận được (|z| ≤ 1SD)</span>
                                </div>
                              )
                            }
                          })()} 
                        </div>
                        {/* Z-score display - completely separate from form layout */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500">Z-score:</span>
                          <span className="ml-2 text-sm font-mono text-blue-600">
                            {computeZ(parseFloat(level.value), levelLimits.mean, levelLimits.sd)?.toFixed(3) || 'N/A'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <span className="text-sm">Nhập giá trị để xem kết quả đánh giá</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setDeviceId('')
                setTestId('')
                setPerformerId(session?.user?.id || '')
                setRunAt(() => {
                  const now = new Date()
                  const offset = now.getTimezoneOffset()
                  const localDate = new Date(now.getTime() - offset * 60 * 1000)
                  return localDate.toISOString().slice(0, 16)
                })
                setLevels([{ levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }])
              }}
            >
              Làm mới
            </Button>
            <Button 
              type="submit" 
              disabled={createRunGroupMutation.isPending || createQcRunMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createRunGroupMutation.isPending || createQcRunMutation.isPending ? 'Đang tạo...' : 'Tạo lần chạy QC'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default QuickEntryForm