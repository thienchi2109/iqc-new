'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useTests, useCreateTest, useUpdateTest, useDeleteTest } from '@/hooks/catalog'
import { useUnits, useMethods } from '@/hooks/catalog'
import { Test } from '@/lib/db/schema'

export default function TestsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)

  const { data: tests = [], isLoading } = useTests({ isActive: activeFilter ?? undefined })
  const { data: units = [] } = useUnits()
  const { data: methods = [] } = useMethods()

  const createMutation = useCreateTest()
  const updateMutation = useUpdateTest()
  const deleteMutation = useDeleteTest()

  const columns: Column<Test>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { 
      key: 'defaultUnitId', 
      label: 'Default Unit',
      render: (unitId: string) => units.find(u => u.id === unitId)?.display || '-'
    },
    { 
      key: 'defaultMethodId', 
      label: 'Default Method',
      render: (methodId: string) => methods.find(m => m.id === methodId)?.name || '-'
    },
    { key: 'decimals', label: 'Decimals' },
    { key: 'isActive', label: 'Status' },
  ]

  const formFields: FormField[] = [
    { name: 'code', label: 'Test Code', type: 'text', required: true },
    { name: 'name', label: 'Test Name', type: 'text', required: true },
    { 
      name: 'defaultUnitId', 
      label: 'Default Unit', 
      type: 'select',
      options: units.map(unit => ({ value: unit.id, label: unit.display }))
    },
    { 
      name: 'defaultMethodId', 
      label: 'Default Method', 
      type: 'select',
      options: methods.map(method => ({ value: method.id, label: method.name }))
    },
    { 
      name: 'decimals', 
      label: 'Decimal Places', 
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
        <h1 className="text-3xl font-bold text-gray-900">Tests</h1>
        <p className="text-gray-600 mt-1">Manage laboratory tests and analytes</p>
      </div>

      <CatalogTable
        data={tests?.map(test => ({ ...test, isActive: test.isActive ?? true })) || []}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingTest(null); setIsDrawerOpen(true) }}
        onEdit={(test) => { setEditingTest(test); setIsDrawerOpen(true) }}
        onDelete={(test) => deleteMutation.mutate(test.id)}
        showActiveFilter
        onActiveFilterChange={setActiveFilter}
        activeFilter={activeFilter}
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingTest ? 'Edit Test' : 'Add Test'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingTest || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}