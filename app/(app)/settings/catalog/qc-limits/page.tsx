'use client'

import { useState, useEffect } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useQcLimits, useCreateQcLimit, useUpdateQcLimit, useDeleteQcLimit } from '@/hooks/catalog'
import { useTests, useDevices, useQcLevels, useQcLots } from '@/hooks/catalog'
import { QcLimit } from '@/lib/db/schema'

export default function QcLimitsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLimit, setEditingLimit] = useState<QcLimit | null>(null)
  const [filters, setFilters] = useState({
    testId: '',
    deviceId: '',
    levelId: '',
    lotId: ''
  })

  const { data: limits = [], isLoading } = useQcLimits(filters)
  const { data: tests = [] } = useTests({ isActive: true })
  const { data: devices = [] } = useDevices({ isActive: true })
  const { data: levels = [] } = useQcLevels({ isActive: true })
  const { data: lots = [] } = useQcLots()

  const createMutation = useCreateQcLimit()
  const updateMutation = useUpdateQcLimit()
  const deleteMutation = useDeleteQcLimit()

  const columns: Column<QcLimit>[] = [
    { 
      key: 'testId', 
      label: 'Test',
      render: (testId: string) => {
        const test = tests.find(t => t.id === testId)
        return test ? `${test.code}` : testId
      }
    },
    { 
      key: 'deviceId', 
      label: 'Device',
      render: (deviceId: string) => {
        const device = devices.find(d => d.id === deviceId)
        return device ? device.code : deviceId
      }
    },
    { 
      key: 'levelId', 
      label: 'Level',
      render: (levelId: string) => {
        const level = levels.find(l => l.id === levelId)
        return level ? level.level : levelId
      }
    },
    { 
      key: 'lotId', 
      label: 'Lot',
      render: (lotId: string) => {
        const lot = lots.find(l => l.id === lotId)
        return lot ? lot.lotCode : lotId
      }
    },
    { key: 'mean', label: 'Mean' },
    { key: 'sd', label: 'SD' },
    { 
      key: 'cv', 
      label: 'CV (%)',
      render: (cv: string) => `${cv}%`
    },
    { key: 'source', label: 'Source' },
  ]

  const getFormFields = (): FormField[] => [
    {
      name: 'testId',
      label: 'Test',
      type: 'select',
      required: true,
      options: tests.map(test => ({ 
        value: test.id, 
        label: `${test.code} - ${test.name}` 
      }))
    },
    {
      name: 'deviceId',
      label: 'Device',
      type: 'select',
      required: true,
      options: devices.map(device => ({ 
        value: device.id, 
        label: `${device.code} - ${device.name}` 
      }))
    },
    {
      name: 'levelId',
      label: 'QC Level',
      type: 'select',
      required: true,
      options: levels.map(level => {
        const test = tests.find(t => t.id === level.testId)
        return { 
          value: level.id, 
          label: test ? `${test.code} - ${level.level}` : level.level
        }
      })
    },
    {
      name: 'lotId',
      label: 'QC Lot',
      type: 'select',
      required: true,
      options: lots.map(lot => {
        const level = levels.find(l => l.id === lot.levelId)
        const test = tests.find(t => t.id === level?.testId)
        return { 
          value: lot.id, 
          label: test ? `${test.code} - ${lot.lotCode}` : lot.lotCode
        }
      })
    },
    {
      name: 'mean',
      label: 'Mean',
      type: 'number',
      required: true,
      validation: { min: 0 },
      description: 'Target mean value'
    },
    {
      name: 'sd',
      label: 'Standard Deviation (SD)',
      type: 'number',
      required: true,
      validation: { min: 0 },
      description: 'Standard deviation value'
    },
    {
      name: 'source',
      label: 'Source',
      type: 'select',
      required: true,
      options: [
        { value: 'manufacturer', label: 'Manufacturer' },
        { value: 'lab', label: 'Laboratory' },
      ],
      description: 'Source of the statistical limits'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    if (editingLimit) {
      // For updates, only send the modifiable fields
      const data = {
        mean: parseFloat(formData.mean).toString(),
        sd: parseFloat(formData.sd).toString(),
        source: formData.source as 'manufacturer' | 'lab',
      }
      await updateMutation.mutateAsync({ id: editingLimit.id, data })
    } else {
      // For creation, send all required fields
      const data = {
        testId: formData.testId,
        levelId: formData.levelId,
        lotId: formData.lotId,
        deviceId: formData.deviceId,
        mean: parseFloat(formData.mean).toString(),
        sd: parseFloat(formData.sd).toString(),
        source: formData.source as 'manufacturer' | 'lab',
      }
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">QC Limits</h1>
        <p className="text-gray-600 mt-1">Manage QC statistical limits (mean, SD, CV) for test-device-lot combinations</p>
      </div>

      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <select
          value={filters.testId}
          onChange={(e) => setFilters(prev => ({ ...prev, testId: e.target.value }))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Tests</option>
          {tests.map(test => (
            <option key={test.id} value={test.id}>{test.code}</option>
          ))}
        </select>
        
        <select
          value={filters.deviceId}
          onChange={(e) => setFilters(prev => ({ ...prev, deviceId: e.target.value }))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Devices</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>{device.code}</option>
          ))}
        </select>

        <select
          value={filters.levelId}
          onChange={(e) => setFilters(prev => ({ ...prev, levelId: e.target.value }))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Levels</option>
          {levels.map(level => (
            <option key={level.id} value={level.id}>{level.level}</option>
          ))}
        </select>

        <select
          value={filters.lotId}
          onChange={(e) => setFilters(prev => ({ ...prev, lotId: e.target.value }))}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">All Lots</option>
          {lots.map(lot => (
            <option key={lot.id} value={lot.id}>{lot.lotCode}</option>
          ))}
        </select>
      </div>

      <CatalogTable
        data={limits}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingLimit(null); setIsDrawerOpen(true) }}
        onEdit={(limit) => { setEditingLimit(limit); setIsDrawerOpen(true) }}
        onDelete={(limit) => deleteMutation.mutate(limit.id)}
        emptyMessage="No QC limits found. Configure your first QC limit to get started."
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingLimit ? 'Edit QC Limit' : 'Add QC Limit'}
        fields={getFormFields()}
        onSubmit={handleSubmit}
        initialData={editingLimit || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
        size="lg"
      />
    </div>
  )
}