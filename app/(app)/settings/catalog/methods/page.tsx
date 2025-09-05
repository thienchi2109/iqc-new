'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useMethods, useCreateMethod, useUpdateMethod, useDeleteMethod, Method } from '@/hooks/catalog'

export default function MethodsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<Method | null>(null)

  const { data: methods = [], isLoading } = useMethods()
  const createMutation = useCreateMethod()
  const updateMutation = useUpdateMethod()
  const deleteMutation = useDeleteMethod()

  const columns: Column<Method>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
  ]

  const formFields: FormField[] = [
    { 
      name: 'code', 
      label: 'Method Code', 
      type: 'text', 
      required: true,
      placeholder: 'e.g., ENZYMATIC, IMMUNOASSAY'
    },
    { 
      name: 'name', 
      label: 'Method Name', 
      type: 'text', 
      required: true,
      placeholder: 'e.g., Enzymatic Method, Immunoassay'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      code: formData.code,
      name: formData.name,
    }

    if (editingMethod) {
      await updateMutation.mutateAsync({ id: editingMethod.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Methods</h1>
        <p className="text-gray-600 mt-1">Manage analytical methods used for testing</p>
      </div>

      <CatalogTable
        data={methods}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingMethod(null); setIsDrawerOpen(true) }}
        onEdit={(method) => { setEditingMethod(method); setIsDrawerOpen(true) }}
        onDelete={(method) => deleteMutation.mutate(method.id)}
        emptyMessage="No methods found. Add your first method to get started."
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingMethod ? 'Edit Method' : 'Add Method'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingMethod || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}