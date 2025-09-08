'use client'

import { useEffect, useMemo, useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import CustomSelect from '@/components/ui/CustomSelect'
import { useQcLevels, useCreateQcLevel, useUpdateQcLevel, useDeleteQcLevel } from '@/hooks/catalog'
import { useTests } from '@/hooks/catalog'
import { QcLevel } from '@/lib/db/schema'

export default function QcLevelsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<QcLevel | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Build filters without undefined to ensure query enabling logic works
  const filters = {
    ...(selectedTestId && { testId: selectedTestId }),
    ...(activeFilter !== null && { isActive: activeFilter }),
  }
  const { data: levels = [], isLoading } = useQcLevels(filters)
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

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Build lookup map for tests
  const testById = useMemo(() => {
    const m = new Map<string, { code: string; name: string }>()
    for (const t of tests) m.set(t.id, { code: t.code, name: t.name })
    return m
  }, [tests])

  // Apply optional local test filter + text search across multiple fields
  const filteredLevels = useMemo(() => {
    const base = selectedTestId ? levels.filter(l => l.testId === selectedTestId) : levels
    if (!debouncedQuery) return base
    return base.filter((l) => {
      const t = testById.get(l.testId)
      const haystack = [l.level, l.material || '', t?.code || '', t?.name || '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(debouncedQuery)
    })
  }, [levels, selectedTestId, debouncedQuery, testById])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Mức QC</h1>
  <p className="text-gray-600 mt-1">Quản lý mức kiểm soát chất lượng (L1, L2, L3) cho các xét nghiệm</p>
      </div>

      <CatalogTable
        data={filteredLevels?.map(level => ({ ...level, isActive: level.isActive ?? true })) || []}
        columns={columns}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        onAdd={() => { setEditingLevel(null); setIsDrawerOpen(true) }}
        onEdit={(level) => { setEditingLevel(level); setIsDrawerOpen(true) }}
        onDelete={(level) => deleteMutation.mutate(level.id)}
        showActiveFilter
        onActiveFilterChange={setActiveFilter}
        activeFilter={activeFilter}
        headerExtras={
          <CustomSelect
            className="min-w-[260px]"
            value={selectedTestId}
            onChange={(testId) => setSelectedTestId(testId)}
            options={[
              { value: '', label: 'Tất cả xét nghiệm' },
              ...tests.map(test => ({ value: test.id, label: `${test.code} - ${test.name}` })),
            ]}
            placeholder="Lọc theo xét nghiệm (tuỳ chọn)"
          />
        }
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
