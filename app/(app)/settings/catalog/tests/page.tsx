'use client'

import { useEffect, useMemo, useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useTests, useCreateTest, useUpdateTest, useDeleteTest } from '@/hooks/catalog'
import { useUnits, useMethods } from '@/hooks/catalog'
import { Test } from '@/lib/db/schema'

export default function TestsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { data: tests = [], isLoading } = useTests({ isActive: activeFilter ?? undefined, q: debouncedQuery || undefined })
  const { data: units = [] } = useUnits()
  const { data: methods = [] } = useMethods()

  const createMutation = useCreateTest()
  const updateMutation = useUpdateTest()
  const deleteMutation = useDeleteTest()

  // Debounce search for 300ms (server-side q)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const columns: Column<Test>[] = [
    { key: 'code', label: 'Mã', sortable: true },
    { key: 'name', label: 'Tên', sortable: true },
    { 
      key: 'defaultUnitId', 
      label: 'Đơn vị mặc định',
      render: (unitId: string) => units.find(u => u.id === unitId)?.display || '-'
    },
    { 
      key: 'defaultMethodId', 
      label: 'Phương pháp mặc định',
      render: (methodId: string) => methods.find(m => m.id === methodId)?.name || '-'
    },
    { key: 'decimals', label: 'Số chữ số thập phân' },
    { key: 'isActive', label: 'Trạng thái' },
  ]

  const formFields: FormField[] = [
    { name: 'code', label: 'Mã xét nghiệm', type: 'text', required: true },
    { name: 'name', label: 'Tên xét nghiệm', type: 'text', required: true },
    { 
      name: 'defaultUnitId', 
      label: 'Đơn vị mặc định', 
      type: 'select',
      options: units.map(unit => ({ value: unit.id, label: unit.display }))
    },
    { 
      name: 'defaultMethodId', 
      label: 'Phương pháp mặc định', 
      type: 'select',
      options: methods.map(method => ({ value: method.id, label: method.name }))
    },
    { 
      name: 'decimals', 
      label: 'Số chữ số thập phân', 
      type: 'number', 
      defaultValue: 2,
      validation: { min: 0, max: 6 }
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      code: formData.code,
      name: formData.name,
      defaultUnitId: formData.defaultUnitId || null,
      defaultMethodId: formData.defaultMethodId || null,
      decimals: parseInt(formData.decimals) || 2,
    }

    if (editingTest) {
      await updateMutation.mutateAsync({ id: editingTest.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Xét nghiệm</h1>
  <p className="text-gray-600 mt-1">Quản lý các xét nghiệm và chất phân tích</p>
      </div>

      <CatalogTable
        data={(tests || []).map(test => ({ ...test, isActive: test.isActive ?? true }))}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingTest(null); setIsDrawerOpen(true) }}
        onEdit={(test) => { setEditingTest(test); setIsDrawerOpen(true) }}
        onDelete={(test) => deleteMutation.mutate(test.id)}
        showActiveFilter
        onActiveFilterChange={setActiveFilter}
        activeFilter={activeFilter}
        onSearch={setSearchQuery}
  searchPlaceholder="Tìm mã, tên, đơn vị, phương pháp"
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingTest ? 'Chỉnh sửa xét nghiệm' : 'Thêm xét nghiệm'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingTest || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
