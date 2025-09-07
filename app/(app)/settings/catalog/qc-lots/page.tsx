'use client'

import { useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import SelectTest from '@/components/SelectTest'
import SelectLevel from '@/components/SelectLevel'
import DateInputVN from '@/components/DateInputVN'
import { useQcLots, useCreateQcLot, useUpdateQcLot, useDeleteQcLot } from '@/hooks/catalog'
import { useTests, useQcLevels } from '@/hooks/catalog'
import { QcLot } from '@/lib/db/schema'

export default function QcLotsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<QcLot | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')

  const { data: lots = [], isLoading } = useQcLots({ 
    levelId: selectedLevelId || undefined 
  })
  const { data: tests = [] } = useTests({ isActive: true })
  const { data: levels = [] } = useQcLevels({ isActive: true })
  
  const createMutation = useCreateQcLot()
  const updateMutation = useUpdateQcLot()
  const deleteMutation = useDeleteQcLot()

  const columns: Column<QcLot>[] = [
    { 
      key: 'levelId', 
  label: 'Xét nghiệm / Mức',
      render: (levelId: string) => {
        const level = levels.find(l => l.id === levelId)
        if (!level) return levelId
        const test = tests.find(t => t.id === level.testId)
        return test ? `${test.code} - ${level.level}` : `${level.level}`
      }
    },
    { key: 'lotCode', label: 'Mã lô', sortable: true },
    { 
      key: 'expireDate', 
      label: 'Ngày hết hạn',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
    },
    { 
      key: 'effectiveFrom', 
      label: 'Có hiệu lực từ',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
    },
    { key: 'supplier', label: 'Nhà cung cấp' },
  ]

  // Get custom form fields function to access state
  const getFormFields = (): FormField[] => [
    {
  name: 'levelId',
  label: 'Mức QC',
      type: 'select',
      required: true,
      options: levels.map(level => {
        const test = tests.find(t => t.id === level.testId)
        return { 
          value: level.id, 
          label: test ? `${test.code} - ${level.level}` : level.level
        }
      })
    },
    {
  name: 'lotCode',
  label: 'Mã lô',
      type: 'text',
      required: true,
  placeholder: 'ví dụ: LOT001, BATCH123'
    },
    {
  name: 'expireDate',
  label: 'Ngày hết hạn',
      type: 'date',
      required: true,
    },
    {
  name: 'effectiveFrom',
  label: 'Có hiệu lực từ',
      type: 'date',
      required: true,
    },
    {
  name: 'effectiveTo',
  label: 'Có hiệu lực đến',
      type: 'date',
    },
    {
  name: 'supplier',
  label: 'Nhà cung cấp',
  type: 'text',
  placeholder: 'ví dụ: Bio-Rad, Roche'
    },
    {
  name: 'notes',
  label: 'Ghi chú',
  type: 'textarea',
  placeholder: 'Thông tin bổ sung về lô này...'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    const data = {
      levelId: formData.levelId,
      lotCode: formData.lotCode,
      expireDate: formData.expireDate,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      supplier: formData.supplier || null,
      notes: formData.notes || null,
    }

    if (editingLot) {
      await updateMutation.mutateAsync({ id: editingLot.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Lô QC</h1>
  <p className="text-gray-600 mt-1">Quản lý lô và đợt kiểm soát chất lượng</p>
      </div>

      <div className="mb-4 flex gap-4">
        <SelectTest
          value={selectedTestId}
          onChange={(testId) => {
            setSelectedTestId(testId)
            setSelectedLevelId('') // Reset level when test changes
          }}
          tests={tests?.map(test => ({ ...test, isActive: test.isActive ?? true })) || []}
          placeholder="Lọc theo xét nghiệm (tùy chọn)"
          className="max-w-md"
        />
        <SelectLevel
          value={selectedLevelId}
          onChange={(levelId) => setSelectedLevelId(levelId)}
          levels={levels?.map(level => ({ ...level, isActive: level.isActive ?? true, material: level.material ?? undefined })) || []}
          testId={selectedTestId}
          placeholder="Lọc theo mức (tùy chọn)"
          className="max-w-md"
        />
      </div>

      <CatalogTable
        data={lots}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingLot(null); setIsDrawerOpen(true) }}
        onEdit={(lot) => { setEditingLot(lot); setIsDrawerOpen(true) }}
        onDelete={(lot) => deleteMutation.mutate(lot.id)}
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingLot ? 'Chỉnh sửa lô QC' : 'Thêm lô QC'}
        fields={getFormFields()}
        onSubmit={handleSubmit}
        initialData={editingLot || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
        size="lg"
      />
    </div>
  )
}