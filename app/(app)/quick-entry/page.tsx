'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import CustomSelect from '@/components/ui/CustomSelect'
import { Button } from '@/components/ui/button'

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

interface LevelEntry {
  levelId: string
  lotId: string
  value: string
  unitId: string
  methodId: string
  notes?: string
}

export default function QuickEntry() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [deviceId, setDeviceId] = useState('')
  const [testId, setTestId] = useState('')
  const [runAt, setRunAt] = useState(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localDate = new Date(now.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  })
  const [levels, setLevels] = useState<LevelEntry[]>([
    { levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' },
  ])

  // Master data
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-runs'] })
      queryClient.invalidateQueries({ queryKey: ['run-stats'] })
    },
  })

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

  const updateLevel = (index: number, field: keyof LevelEntry, value: string) => {
    const newLevels = [...levels]
    newLevels[index] = { ...newLevels[index], [field]: value }
    setLevels(newLevels)
  }

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
            performerId: session.user.id,
            notes: level.notes,
          })
        }
      }

      // Reset form
      setDeviceId('')
      setTestId('')
      setRunAt(() => {
        const now = new Date()
        const offset = now.getTimezoneOffset()
        const localDate = new Date(now.getTime() - offset * 60 * 1000)
        return localDate.toISOString().slice(0, 16)
      })
      setLevels([{ levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }])

      alert('Tạo lần chạy QC thành công!')
    } catch (error) {
      console.error('Lỗi khi tạo lần chạy QC:', error)
      alert('Lỗi khi tạo lần chạy QC. Vui lòng thử lại.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nhập kết quả QC</h1>
        <p className="text-gray-600 mt-1">Nhập dữ liệu QC cho tối đa 3 mức trong một phiên</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-6">
        {/* Run Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị *</label>
            <CustomSelect
              value={deviceId}
              onChange={(value) => setDeviceId(value)}
              options={devices?.map((device) => ({ value: device.id, label: `${device.code} - ${device.name}` })) || []}
              placeholder="Chọn thiết bị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xét nghiệm *</label>
            <CustomSelect
              value={testId}
              onChange={(value) => handleTestChange(value)}
              options={tests?.map((test) => ({ value: test.id, label: `${test.code} - ${test.name}` })) || []}
              placeholder="Chọn xét nghiệm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày/giờ chạy *</label>
            <Input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} required />
          </div>
        </div>

        {/* QC Levels */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Mức QC</h3>
            {levels.length < 3 && (
              <Button type="button" onClick={addLevel} variant="outline" size="sm">
                Thêm mức
              </Button>
            )}
          </div>

          {levels.map((level, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Mức {index + 1}</h4>
                {levels.length > 1 && (
                  <Button type="button" onClick={() => removeLevel(index)} variant="destructive" size="sm">
                    Xóa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức QC *</label>
                  <CustomSelect
                    value={level.levelId}
                    onChange={(value) => updateLevel(index, 'levelId', value)}
                    options={qcLevels?.map((qcLevel) => ({ value: qcLevel.id, label: `${qcLevel.level} - ${qcLevel.material}` })) || []}
                    placeholder="Chọn mức"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lô QC *</label>
                  <CustomSelect
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={level.value}
                    onChange={(e) => updateLevel(index, 'value', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị *</label>
                  <CustomSelect
                    value={level.unitId}
                    onChange={(value) => updateLevel(index, 'unitId', value)}
                    options={units?.map((unit) => ({ value: unit.id, label: unit.display })) || []}
                    placeholder="Chọn đơn vị"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương pháp *</label>
                  <CustomSelect
                    value={level.methodId}
                    onChange={(value) => updateLevel(index, 'methodId', value)}
                    options={methods?.map((method) => ({ value: method.id, label: method.name })) || []}
                    placeholder="Chọn phương pháp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <Input
                    type="text"
                    value={level.notes || ''}
                    onChange={(e) => updateLevel(index, 'notes', e.target.value)}
                    placeholder="Ghi chú tùy chọn"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeviceId('')
              setTestId('')
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
          <Button type="submit" disabled={createRunGroupMutation.isPending || createQcRunMutation.isPending}>
            {createRunGroupMutation.isPending || createQcRunMutation.isPending ? 'Đang tạo...' : 'Tạo lần chạy QC'}
          </Button>
        </div>
      </form>
    </div>
  )
}

