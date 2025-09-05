'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit, Unit } from '@/hooks/catalog'

export default function UnitsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const { data: units = [], isLoading } = useUnits()
  const createMutation = useCreateUnit()
  const updateMutation = useUpdateUnit()
  const deleteMutation = useDeleteUnit()

  const columns: Column<Unit>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'display', label: 'Display Name', sortable: true },
  ]

  const formFields: FormField[] = [
    { 
      name: 'code', 
      label: 'Unit Code', 
      type: 'text', 
      required: true,
      placeholder: 'e.g., mg/dL, U/L, mmol/L'
    },
    { 
      name: 'display', 
      label: 'Display Name', 
      type: 'text', 
      required: true,
      placeholder: 'e.g., mg/dL, U/L, mmol/L'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      code: formData.code,
      display: formData.display,
    }

    if (editingUnit) {
      await updateMutation.mutateAsync({ id: editingUnit.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Units</h1>
        <p className="text-gray-600 mt-1">Manage measurement units for test results</p>
      </div>

      <CatalogTable
        data={units}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingUnit(null); setIsDrawerOpen(true) }}
        onEdit={(unit) => { setEditingUnit(unit); setIsDrawerOpen(true) }}
        onDelete={(unit) => deleteMutation.mutate(unit.id)}
        emptyMessage="No units found. Add your first unit to get started."
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingUnit || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}