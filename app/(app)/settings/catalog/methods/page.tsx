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
  { key: 'code', label: 'Mã', sortable: true },
  { key: 'name', label: 'Tên', sortable: true },
  ]

  const formFields: FormField[] = [
    { 
      name: 'code', 
  label: 'Mã phương pháp', 
      type: 'text', 
      required: true,
  placeholder: 'ví dụ: ENZYMATIC, IMMUNOASSAY'
    },
    { 
      name: 'name', 
  label: 'Tên phương pháp', 
      type: 'text', 
      required: true,
  placeholder: 'ví dụ: Phương pháp Enzymatic, Immunoassay'
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
  <h1 className="text-3xl font-bold text-gray-900">Phương pháp</h1>
  <p className="text-gray-600 mt-1">Quản lý các phương pháp phân tích sử dụng cho xét nghiệm</p>
      </div>

      <CatalogTable
        data={methods}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingMethod(null); setIsDrawerOpen(true) }}
        onEdit={(method) => { setEditingMethod(method); setIsDrawerOpen(true) }}
        onDelete={(method) => deleteMutation.mutate(method.id)}
  emptyMessage="Không tìm thấy phương pháp nào. Thêm phương pháp đầu tiên để bắt đầu."
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingMethod ? 'Chỉnh sửa phương pháp' : 'Thêm phương pháp'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingMethod || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}