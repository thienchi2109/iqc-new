'use client'

import { useEffect } from 'react'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/label'

export interface SelectOption {
  id: string
  code: string
  name: string
  isActive?: boolean
}

export interface SelectTestProps {
  label?: string
  value?: string
  onChange?: (testId: string, test?: SelectOption) => void
  tests: SelectOption[]
  isLoading?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
  placeholder?: string
  showCode?: boolean
  activeOnly?: boolean
  className?: string
  id?: string
}

export default function SelectTest({
  label = 'Test',
  value = '',
  onChange,
  tests = [],
  isLoading = false,
  required = false,
  disabled = false,
  error,
  placeholder,
  showCode = true,
  activeOnly = true,
  className = '',
  id,
}: SelectTestProps) {
  // Filter tests based on activeOnly setting
  const filteredTests = activeOnly 
    ? tests.filter(test => test.isActive !== false)
    : tests

  const handleChange = (testId: string) => {
    const selectedTest = filteredTests.find(test => test.id === testId)
    onChange?.(testId, selectedTest)
  }

  const getDisplayText = (test: SelectOption): string => {
    if (showCode && test.code) {
      return `${test.code} - ${test.name}`
    }
    return test.name
  }

  const finalPlaceholder = placeholder || `Select ${label}`

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
        disabled={disabled || isLoading}
        className={error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      >
        <option value="">{isLoading ? 'Loading...' : finalPlaceholder}</option>
        {filteredTests.map((test) => (
          <option key={test.id} value={test.id}>
            {getDisplayText(test)}
          </option>
        ))}
      </Select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
