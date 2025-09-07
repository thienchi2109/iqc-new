'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import SelectTest from '@/components/SelectTest'
import { useQcLevels, useCreateQcLevel, useUpdateQcLevel, useDeleteQcLevel } from '@/hooks/catalog'
import { useTests } from '@/hooks/catalog'
import { QcLevel } from '@/lib/db/schema'

export default function QcLevelsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<QcLevel | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')

  const { data: levels = [], isLoading } = useQcLevels({ isActive: activeFilter ?? undefined })
  const { data: tests = [] } = useTests({ isActive: true })
  const createMutation = useCreateQcLevel()
  const updateMutation = useUpdateQcLevel()
  const deleteMutation = useDeleteQcLevel()

  const columns: Column<QcLevel>[] = [
    { 
      key: 'testId', 
  label: 'Xét nghiệm',
      render: (testId: string) => {
        const test = tests.find(t => t.id === testId)
        return test ? `${test.code} - ${test.name}` : testId
      }
    },
  { key: 'level', label: 'Mức', sortable: true },
  { key: 'material', label: 'Mô tả vật liệu' },
  { key: 'isActive', label: 'Trạng thái' },
  ]

  const formFields: FormField[] = [
    {
  name: 'testId',
  label: 'Xét nghiệm',
      type: 'select',
      required: true,
      options: tests.map(test => ({ 
        value: test.id, 
        label: `${test.code} - ${test.name}` 
      }))
    },
    {
      name: 'level',
      label: 'Mức QC',
      type: 'select',
      required: true,
      options: [
        { value: 'L1', label: 'L1 (Mức 1)' },
        { value: 'L2', label: 'L2 (Mức 2)' },
        { value: 'L3', label: 'L3 (Mức 3)' },
      ]
    },
    {
      name: 'material',
      label: 'Mô tả vật liệu',
      type: 'text',
      placeholder: 'ví dụ: Bình thường, Cao bất thường, Thấp bất thường'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      testId: formData.testId,
      level: formData.level as 'L1' | 'L2' | 'L3',
      // send undefined when material is empty so backend Zod schema (string | undefined) is satisfied
      material: formData.material === undefined || formData.material === null || formData.material === ''
        ? undefined
        : formData.material,
    }

    if (editingLevel) {
      await updateMutation.mutateAsync({ id: editingLevel.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  // Filter levels by selected test
  const filteredLevels = selectedTestId 
    ? levels.filter(level => level.testId === selectedTestId)
    : levels

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Mức QC</h1>
  <p className="text-gray-600 mt-1">Quản lý mức kiểm soát chất lượng (L1, L2, L3) cho các xét nghiệm</p>
      </div>

      <div className="mb-4">
        <SelectTest
          value={selectedTestId}
          onChange={(testId) => setSelectedTestId(testId)}
          tests={tests?.map(test => ({ ...test, isActive: test.isActive ?? true })) || []}
          placeholder="Lọc theo xét nghiệm (tùy chọn)"
          className="max-w-md"
        />
      </div>

      <CatalogTable
        data={filteredLevels?.map(level => ({ ...level, isActive: level.isActive ?? true })) || []}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingLevel(null); setIsDrawerOpen(true) }}
        onEdit={(level) => { setEditingLevel(level); setIsDrawerOpen(true) }}
        onDelete={(level) => deleteMutation.mutate(level.id)}
        showActiveFilter
        onActiveFilterChange={setActiveFilter}
        activeFilter={activeFilter}
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingLevel ? 'Chỉnh sửa mức QC' : 'Thêm mức QC'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingLevel || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}