'use client'

import { useState, useEffect, useMemo } from 'react'
import CatalogTable, { Column } from '@/components/CatalogTable'
import CatalogFormDrawer, { FormField } from '@/components/CatalogFormDrawer'
import { useQcLimits, useCreateQcLimit, useUpdateQcLimit, useDeleteQcLimit } from '@/hooks/catalog'
import CustomSelect from '@/components/ui/CustomSelect'
import { useTests, useDevices, useQcLevels, useQcLots } from '@/hooks/catalog'

export default function QcLimitsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLimit, setEditingLimit] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    testId: '',
    deviceId: '',
    levelId: '',
    lotId: ''
  })

  // Only include defined filter keys so queries enable correctly
  const limitsFilters = useMemo(() => ({
    ...(filters.testId ? { testId: filters.testId } : {}),
    ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
    ...(filters.levelId ? { levelId: filters.levelId } : {}),
    ...(filters.lotId ? { lotId: filters.lotId } : {}),
  }), [filters])

  const { data: limits = [], isLoading } = useQcLimits(limitsFilters)
  const { data: tests = [] } = useTests({ isActive: true })
  const { data: devices = [] } = useDevices({ isActive: true })
  const { data: levels = [] } = useQcLevels({ isActive: true })
  const { data: lots = [] } = useQcLots()

  const createMutation = useCreateQcLimit()
  const updateMutation = useUpdateQcLimit()
  const deleteMutation = useDeleteQcLimit()

  // Debounced multi-field search across pretty fields
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])
  const visibleLimits = useMemo(() => {
    if (!debouncedQuery) return limits
    const q = debouncedQuery
    return limits.filter((limit: any) => [
      limit.test,
      limit.testName,
      limit.device,
      limit.deviceName,
      limit.level,
      limit.lot,
      limit.source,
    ].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q)))
  }, [limits, debouncedQuery])

  const columns: Column<any>[] = [
    { key: 'test', label: 'Xét nghiệm' },
    { key: 'device', label: 'Thiết bị' },
    { key: 'level', label: 'Mức' },
    { key: 'lot', label: 'Lô' },
    { 
      key: 'mean', 
      label: 'Trung bình',
      render: (mean: number) => mean?.toFixed(4) || '-'
    },
    { 
      key: 'sd', 
      label: 'Độ lệch chuẩn (SD)',
      render: (sd: number) => sd?.toFixed(4) || '-'
    },
    { 
      key: 'cv', 
      label: 'CV (%)',
      render: (cv: number) => cv ? `${cv.toFixed(2)}%` : '-'
    },
    { key: 'source', label: 'Nguồn' },
  ]

  const getFormFields = (): FormField[] => [
    {
  name: 'testId',
  label: 'Xét nghiệm',
      type: 'select',
      required: true,
      options: tests.map(test => ({ 
        value: test.id, 
        label: `${test.code} - ${test.name}` 
      }))
    },
    {
  name: 'deviceId',
  label: 'Thiết bị',
      type: 'select',
      required: true,
      options: devices.map(device => ({ 
        value: device.id, 
        label: `${device.code} - ${device.name}` 
      }))
    },
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
  name: 'lotId',
  label: 'Lô QC',
      type: 'select',
      required: true,
      options: lots.map(lot => {
        const level = levels.find(l => l.id === lot.levelId)
        const test = tests.find(t => t.id === level?.testId)
        return { 
          value: lot.id, 
          label: test ? `${test.code} - ${lot.lotCode}` : lot.lotCode
        }
      })
    },
    {
      name: 'mean',
      label: 'Trung bình',
      type: 'number',
      required: true,
      validation: { min: 0 },
      description: 'Giá trị trung bình mục tiêu'
    },
    {
      name: 'sd',
      label: 'Độ lệch chuẩn (SD)',
      type: 'number',
      required: true,
      validation: { min: 0 },
      description: 'Giá trị độ lệch chuẩn'
    },
    {
      name: 'source',
      label: 'Nguồn',
      type: 'select',
      required: true,
      options: [
        { value: 'manufacturer', label: 'Nhà sản xuất' },
        { value: 'lab', label: 'Phòng xét nghiệm' },
      ],
      description: 'Nguồn của giới hạn thống kê'
    },
  ]

  const handleSubmit = async (formData: Record<string, any>) => {
    if (editingLimit) {
      // For updates, only send the modifiable fields
      const data = {
        mean: parseFloat(formData.mean).toString(),
        sd: parseFloat(formData.sd).toString(),
        source: formData.source as 'manufacturer' | 'lab',
      }
      await updateMutation.mutateAsync({ id: editingLimit.id, data })
    } else {
      // For creation, send all required fields
      const data = {
        testId: formData.testId,
        levelId: formData.levelId,
        lotId: formData.lotId,
        deviceId: formData.deviceId,
        mean: parseFloat(formData.mean).toString(),
        sd: parseFloat(formData.sd).toString(),
        source: formData.source as 'manufacturer' | 'lab',
      }
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
  <h1 className="text-3xl font-bold text-gray-900">Giới hạn QC</h1>
  <p className="text-gray-600 mt-1">Quản lý giới hạn thống kê QC (trung bình, SD, CV) cho các kết hợp xét nghiệm-thiết bị-lô</p>
      </div>

      

      <CatalogTable
        data={visibleLimits}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { setEditingLimit(null); setIsDrawerOpen(true) }}
        onEdit={(limit) => { setEditingLimit(limit); setIsDrawerOpen(true) }}
        onDelete={(limit) => deleteMutation.mutate(limit.id)}
        onSearch={setSearchQuery}
        searchPlaceholder="Tìm theo xét nghiệm, thiết bị, mức, lô hoặc nguồn..."
        emptyMessage="Không tìm thấy giới hạn QC nào. Cấu hình giới hạn QC đầu tiên để bắt đầu."
        headerExtras={
          <>
            <CustomSelect
              className="min-w-[200px]"
              value={filters.testId}
              onChange={(value) => setFilters(prev => ({ ...prev, testId: value, levelId: '', lotId: '' }))}
              options={[{ value: '', label: 'Tất cả xét nghiệm' }, ...tests.map(test => ({ value: test.id, label: `${test.code} - ${test.name}` }))]}
              placeholder="Tất cả xét nghiệm"
            />
            <CustomSelect
              className="min-w-[180px]"
              value={filters.deviceId}
              onChange={(value) => setFilters(prev => ({ ...prev, deviceId: value }))}
              options={[{ value: '', label: 'Tất cả thiết bị' }, ...devices.map(device => ({ value: device.id, label: `${device.code} - ${device.name}` }))]}
              placeholder="Tất cả thiết bị"
            />
            <CustomSelect
              className="min-w-[140px]"
              value={filters.levelId}
              onChange={(value) => setFilters(prev => ({ ...prev, levelId: value, lotId: '' }))}
              options={[
                { value: '', label: 'Tất cả mức' },
                ...levels.filter(l => !filters.testId || l.testId === filters.testId).map(l => ({ value: l.id, label: l.level }))
              ]}
              placeholder="Tất cả mức"
            />
            <CustomSelect
              className="min-w-[160px]"
              value={filters.lotId}
              onChange={(value) => setFilters(prev => ({ ...prev, lotId: value }))}
              options={[
                { value: '', label: 'Tất cả lô' },
                ...lots
                  .filter(l => !filters.levelId || l.levelId === filters.levelId)
                  .filter(l => !filters.testId || (levels.find(x => x.id === l.levelId)?.testId === filters.testId))
                  .map(l => ({ value: l.id, label: l.lotCode }))
              ]}
              placeholder="Tất cả lô"
            />
          </>
        }
      />

      <CatalogFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
  title={editingLimit ? 'Chỉnh sửa giới hạn QC' : 'Thêm giới hạn QC'}
        fields={getFormFields()}
        onSubmit={handleSubmit}
        initialData={editingLimit || {}}
        isLoading={createMutation.isPending || updateMutation.isPending}
        size="lg"
      />
    </div>
  )
}
