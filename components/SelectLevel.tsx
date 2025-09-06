'use client'

import { useEffect } from 'react'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/label'

export interface QcLevel {
  id: string
  testId: string
  level: 'L1' | 'L2' | 'L3'
  material?: string
  isActive?: boolean
}

export interface SelectLevelProps {
  label?: string
  value?: string
  onChange?: (levelId: string, level?: QcLevel) => void
  levels: QcLevel[]
  isLoading?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
  placeholder?: string
  testId?: string // Filter levels by test
  showMaterial?: boolean
  activeOnly?: boolean
  className?: string
  id?: string
}

export default function SelectLevel({
  label = 'QC Level',
  value = '',
  onChange,
  levels = [],
  isLoading = false,
  required = false,
  disabled = false,
  error,
  placeholder,
  testId,
  showMaterial = true,
  activeOnly = true,
  className = '',
  id,
}: SelectLevelProps) {
  // Filter levels based on testId and activeOnly setting
  const filteredLevels = levels.filter(level => {
    if (testId && level.testId !== testId) return false
    if (activeOnly && level.isActive === false) return false
    return true
  })

  // Clear selection if current value is not in filtered levels
  useEffect(() => {
    if (value && !filteredLevels.find(level => level.id === value)) {
      onChange?.('', undefined)
    }
  }, [testId, filteredLevels, value, onChange])

  const handleChange = (levelId: string) => {
    const selectedLevel = filteredLevels.find(level => level.id === levelId)
    onChange?.(levelId, selectedLevel)
  }

  const getDisplayText = (level: QcLevel): string => {
    if (showMaterial && level.material) {
      return `${level.level} - ${level.material}`
    }
    return level.level
  }

  const finalPlaceholder = placeholder || (testId ? `Select ${label}` : 'Select test first')
  const isSelectDisabled = disabled || isLoading || !testId

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isSelectDisabled}
        className={error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      >
        <option value="">
          {isLoading ? 'Loading...' : finalPlaceholder}
        </option>
        {filteredLevels.map((level) => (
          <option key={level.id} value={level.id}>
            {getDisplayText(level)}
          </option>
        ))}
      </Select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {!testId && !error && (
        <p className="mt-1 text-sm text-gray-500">Please select a test first</p>
      )}
    </div>
  )
}
