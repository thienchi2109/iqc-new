'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice } from '@/hooks/catalog'
import { Device } from '@/lib/db/schema'

export default function DevicesPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null)

  const { data: devices = [], isLoading } = useDevices({ isActive: activeFilter ?? undefined })
  const createMutation = useCreateDevice()
  const updateMutation = useUpdateDevice()
  const deleteMutation = useDeleteDevice()

  const columns: Column<Device>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'department', label: 'Department' },
    { key: 'isActive', label: 'Status' },
  ]

  const formFields: FormField[] = [
    { name: 'code', label: 'Device Code', type: 'text', required: true },
    { name: 'name', label: 'Device Name', type: 'text', required: true },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { name: 'model', label: 'Model', type: 'text' },
    { name: 'department', label: 'Department', type: 'text' },
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
        <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
        <p className="text-gray-600 mt-1">Manage laboratory instruments and analyzers</p>
      </div>

      <CatalogTable
        data={devices?.map(device => ({ ...device, isActive: device.isActive ?? true })) || []}
        columns={columns}
        isLoading={isLoading}
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
        title={editingDevice ? 'Edit Device' : 'Add Device'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingDevice || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}