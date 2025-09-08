'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const visibleUnits = useMemo(() => {
    if (!debouncedQuery) return units
    return units.filter(u => (`${u.code} ${u.display}`).toLowerCase().includes(debouncedQuery))
  }, [units, debouncedQuery])

  const columns: Column<Unit>[] = [
  { key: 'code', label: 'Mã', sortable: true },
  { key: 'display', label: 'Tên hiển thị', sortable: true },
  ]

  const formFields: FormField[] = [
    { 
      name: 'code', 
      label: 'Mã đơn vị', 
      type: 'text', 
      required: true,
      placeholder: 'ví dụ: mg/dL, U/L, mmol/L'
    },
    { 
      name: 'display', 
      label: 'Tên hiển thị', 
      type: 'text', 
      required: true,
      placeholder: 'ví dụ: mg/dL, U/L, mmol/L'
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
  <h1 className="text-3xl font-bold text-gray-900">Đơn vị</h1>
  <p className="text-gray-600 mt-1">Quản lý đơn vị đo cho kết quả xét nghiệm</p>
      </div>

      <CatalogTable
        data={visibleUnits}
        columns={columns}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        onAdd={() => { setEditingUnit(null); setIsDrawerOpen(true) }}
        onEdit={(unit) => { setEditingUnit(unit); setIsDrawerOpen(true) }}
        onDelete={(unit) => deleteMutation.mutate(unit.id)}
  emptyMessage="Không tìm thấy đơn vị nào. Thêm đơn vị đầu tiên để bắt đầu."
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingUnit ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingUnit || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
