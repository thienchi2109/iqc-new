'use client'

import { useEffect, useMemo, useState } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import CustomSelect from '@/components/ui/CustomSelect'
import DateInputVN from '@/components/DateInputVN'
import { useQcLots, useCreateQcLot, useUpdateQcLot, useDeleteQcLot } from '@/hooks/catalog'
import { useTests, useQcLevels } from '@/hooks/catalog'
import { QcLot } from '@/lib/db/schema'

export default function QcLotsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<QcLot | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const { data: tests = [] } = useTests({ isActive: true })
  const { data: levels = [] } = useQcLevels({ isActive: true })
  // Determine which levels to query for when a test is selected
  const levelIdsForTest = useMemo(
    () => (selectedTestId ? levels.filter(l => l.testId === selectedTestId).map(l => l.id) : []),
    [selectedTestId, levels]
  )
  // Sanitize filters so we don't pass undefined keys
  // If a test is selected but it has NO levels, force an empty result by
  // passing a never-matching UUID to levelIds to avoid fetching all lots.
  const lotFilters = useMemo(() => {
    if (selectedLevelId) {
      return { levelId: selectedLevelId }
    }
    if (selectedTestId) {
      if (levelIdsForTest.length > 0) {
        return { levelIds: levelIdsForTest }
      }
      // Valid UUID that should not exist as a level id
      return { levelIds: ['00000000-0000-0000-0000-000000000000'] }
    }
    return {}
  }, [selectedLevelId, selectedTestId, levelIdsForTest])
  const { data: lots = [], isLoading } = useQcLots(lotFilters)
  
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

  // Debounced multi-field search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Build maps for richer display and search
  const testById = useMemo(() => {
    const m = new Map<string, { code: string; name: string }>()
    for (const t of tests) m.set(t.id, { code: t.code, name: t.name })
    return m
  }, [tests])
  const levelById = useMemo(() => {
    const m = new Map<string, { level: string; testId: string }>()
    for (const lv of levels) m.set(lv.id, { level: lv.level, testId: lv.testId })
    return m
  }, [levels])

  const filteredLots = useMemo(() => {
    // Apply client-side text search over lot/test/level fields
    if (!debouncedQuery) return lots
    return lots.filter((lot) => {
      const lvl = levelById.get(lot.levelId)
      const tst = lvl ? testById.get(lvl.testId) : undefined
      const haystack = [
        lot.lotCode,
        lot.supplier || '',
        lot.notes || '',
        lvl?.level || '',
        tst?.code || '',
        tst?.name || '',
      ].join(' ').toLowerCase()
      return haystack.includes(debouncedQuery)
    })
  }, [lots, debouncedQuery, levelById, testById])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Lô QC</h1>
  <p className="text-gray-600 mt-1">Quản lý lô và đợt kiểm soát chất lượng</p>
      </div>

      

      <CatalogTable
        data={filteredLots}
        columns={columns}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        onAdd={() => { setEditingLot(null); setIsDrawerOpen(true) }}
        onEdit={(lot) => { setEditingLot(lot); setIsDrawerOpen(true) }}
        onDelete={(lot) => deleteMutation.mutate(lot.id)}
        headerExtras={
          <>
            <CustomSelect
              className="min-w-[220px]"
              value={selectedTestId}
              onChange={(testId) => {
                setSelectedTestId(testId)
                setSelectedLevelId('')
              }}
              options={[
                { value: '', label: 'Tất cả xét nghiệm' },
                ...tests.map(test => ({ value: test.id, label: `${test.code} - ${test.name}` })),
              ]}
              placeholder="Lọc theo xét nghiệm"
            />
            <CustomSelect
              className="min-w-[160px]"
              value={selectedLevelId}
              onChange={(levelId) => setSelectedLevelId(levelId)}
              options={[
                { value: '', label: 'Tất cả mức' },
                ...levels
                  .filter(l => !selectedTestId || l.testId === selectedTestId)
                  .map(l => ({ value: l.id, label: l.level }))
              ]}
              placeholder="Lọc theo mức"
            />
          </>
        }
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
