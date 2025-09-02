'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

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
  const [runAt, setRunAt] = useState(new Date().toISOString().slice(0, 16))
  const [levels, setLevels] = useState<LevelEntry[]>([
    { levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }
  ])

  // Fetch master data
  const { data: devices } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: () => fetch('/api/devices').then(res => res.json()),
  })

  const { data: tests } = useQuery<Test[]>({
    queryKey: ['tests'],
    queryFn: () => fetch('/api/tests').then(res => res.json()),
  })

  const { data: units } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => fetch('/api/units').then(res => res.json()),
  })

  const { data: methods } = useQuery<Method[]>({
    queryKey: ['methods'],
    queryFn: () => fetch('/api/methods').then(res => res.json()),
  })

  // Fetch QC levels when test is selected
  const { data: qcLevels } = useQuery<QcLevel[]>({
    queryKey: ['qc-levels', testId],
    queryFn: () => fetch(`/api/qc/levels?testId=${testId}`).then(res => res.json()),
    enabled: !!testId,
  })

  // Fetch QC lots when level is selected
  const { data: qcLots } = useQuery<QcLot[]>({
    queryKey: ['qc-lots', levels.map(l => l.levelId).filter(Boolean)],
    queryFn: () => {
      const levelIds = levels.map(l => l.levelId).filter(Boolean)
      if (levelIds.length === 0) return []
      return fetch(`/api/qc/lots?${levelIds.map(id => `levelId=${id}`).join('&')}`).then(res => res.json())
    },
    enabled: levels.some(l => l.levelId),
  })

  // Create run group mutation
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

  // Create QC run mutation
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

  const selectedTest = tests?.find(t => t.id === testId)

  const addLevel = () => {
    if (levels.length < 3) {
      setLevels([...levels, { 
        levelId: '', 
        lotId: '', 
        value: '', 
        unitId: selectedTest?.defaultUnitId || '', 
        methodId: selectedTest?.defaultMethodId || '', 
        notes: '' 
      }])
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
    const test = tests?.find(t => t.id === newTestId)
    
    // Auto-fill unit and method for all levels
    if (test) {
      setLevels(levels.map(level => ({
        ...level,
        unitId: test.defaultUnitId || level.unitId,
        methodId: test.defaultMethodId || level.methodId,
      })))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) return

    try {
      // Create run group first
      const runGroup = await createRunGroupMutation.mutateAsync({
        deviceId,
        testId,
        runAt,
      })

      // Create QC runs for each level
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
      setRunAt(new Date().toISOString().slice(0, 16))
      setLevels([{ levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }])
      
      alert('QC runs created successfully!')
    } catch (error) {
      console.error('Error creating QC runs:', error)
      alert('Error creating QC runs. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quick Entry</h1>
        <p className="text-gray-600 mt-1">
          Enter QC data for up to 3 levels in one session
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-6">
        {/* Run Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device *
            </label>
            <Select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            >
              <option value="">Select Device</option>
              {devices?.map(device => (
                <option key={device.id} value={device.id}>
                  {device.code} - {device.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test *
            </label>
            <Select
              value={testId}
              onChange={(e) => handleTestChange(e.target.value)}
              required
            >
              <option value="">Select Test</option>
              {tests?.map(test => (
                <option key={test.id} value={test.id}>
                  {test.code} - {test.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Run Date/Time *
            </label>
            <Input
              type="datetime-local"
              value={runAt}
              onChange={(e) => setRunAt(e.target.value)}
              required
            />
          </div>
        </div>

        {/* QC Levels */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">QC Levels</h3>
            {levels.length < 3 && (
              <Button type="button" onClick={addLevel} variant="outline" size="sm">
                Add Level
              </Button>
            )}
          </div>

          {levels.map((level, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Level {index + 1}</h4>
                {levels.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeLevel(index)}
                    variant="destructive"
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QC Level *
                  </label>
                  <Select
                    value={level.levelId}
                    onChange={(e) => updateLevel(index, 'levelId', e.target.value)}
                    required
                  >
                    <option value="">Select Level</option>
                    {qcLevels?.map(qcLevel => (
                      <option key={qcLevel.id} value={qcLevel.id}>
                        {qcLevel.level} - {qcLevel.material}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QC Lot *
                  </label>
                  <Select
                    value={level.lotId}
                    onChange={(e) => updateLevel(index, 'lotId', e.target.value)}
                    required
                    disabled={!level.levelId}
                  >
                    <option value="">Select Lot</option>
                    {qcLots?.filter(lot => lot.levelId === level.levelId).map(lot => (
                      <option key={lot.id} value={lot.id}>
                        {lot.lotCode} (Exp: {lot.expireDate})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <Select
                    value={level.unitId}
                    onChange={(e) => updateLevel(index, 'unitId', e.target.value)}
                    required
                  >
                    <option value="">Select Unit</option>
                    {units?.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.display}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method *
                  </label>
                  <Select
                    value={level.methodId}
                    onChange={(e) => updateLevel(index, 'methodId', e.target.value)}
                    required
                  >
                    <option value="">Select Method</option>
                    {methods?.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Input
                    type="text"
                    value={level.notes || ''}
                    onChange={(e) => updateLevel(index, 'notes', e.target.value)}
                    placeholder="Optional notes"
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
              setRunAt(new Date().toISOString().slice(0, 16))
              setLevels([{ levelId: '', lotId: '', value: '', unitId: '', methodId: '', notes: '' }])
            }}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={createRunGroupMutation.isPending || createQcRunMutation.isPending}
          >
            {(createRunGroupMutation.isPending || createQcRunMutation.isPending) 
              ? 'Creating...' 
              : 'Create QC Runs'
            }
          </Button>
        </div>
      </form>
    </div>
  )
}