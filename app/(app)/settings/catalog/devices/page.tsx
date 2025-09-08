'use client'

import { useEffect, useMemo, useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice } from '@/hooks/catalog'
import { Device } from '@/lib/db/schema'

export default function DevicesPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const { data: devices = [], isLoading } = useDevices({ isActive: activeFilter ?? undefined })
  const createMutation = useCreateDevice()
  const updateMutation = useUpdateDevice()
  const deleteMutation = useDeleteDevice()

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const visibleDevices = useMemo(() => {
    if (!debouncedQuery) return devices
    return devices.filter((d) => {
      const hay = [d.code, d.name, d.manufacturer || '', d.model || '', d.department || '']
        .join(' ')
        .toLowerCase()
      return hay.includes(debouncedQuery)
    })
  }, [devices, debouncedQuery])

  const columns: Column<Device>[] = [
  { key: 'code', label: 'Mã', sortable: true },
  { key: 'name', label: 'Tên', sortable: true },
  { key: 'manufacturer', label: 'Nhà sản xuất' },
  { key: 'model', label: 'Mẫu', },
  { key: 'department', label: 'Khoa/Phòng' },
  { key: 'isActive', label: 'Trạng thái' },
  ]

  const formFields: FormField[] = [
  { name: 'code', label: 'Mã thiết bị', type: 'text', required: true },
  { name: 'name', label: 'Tên thiết bị', type: 'text', required: true },
  { name: 'manufacturer', label: 'Nhà sản xuất', type: 'text' },
  { name: 'model', label: 'Mẫu', type: 'text' },
  { name: 'department', label: 'Khoa/Phòng', type: 'text' },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      code: formData.code,
      name: formData.name,
      manufacturer: formData.manufacturer || null,
      model: formData.model || null,
      department: formData.department || null,
    }

    if (editingDevice) {
      await updateMutation.mutateAsync({ id: editingDevice.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Thiết bị</h1>
  <p className="text-gray-600 mt-1">Quản lý thiết bị và máy phân tích phòng xét nghiệm</p>
      </div>

      <CatalogTable
        data={visibleDevices?.map(device => ({ ...device, isActive: device.isActive ?? true })) || []}
        columns={columns}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        onAdd={() => { setEditingDevice(null); setIsDrawerOpen(true) }}
        onEdit={(device) => { setEditingDevice(device); setIsDrawerOpen(true) }}
        onDelete={(device) => deleteMutation.mutate(device.id)}
        showActiveFilter
        onActiveFilterChange={setActiveFilter}
        activeFilter={activeFilter}
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingDevice ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingDevice || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
