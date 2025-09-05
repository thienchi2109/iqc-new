'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'

export interface DateInputVNProps {
  label?: string
  value?: string // ISO date string (YYYY-MM-DD) or Vietnamese format (dd/MM/yyyy)
  onChange?: (isoDate: string) => void // Always returns ISO format
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
  id?: string
  minDate?: string // ISO format
  maxDate?: string // ISO format
}

export default function DateInputVN({
  label,
  value = '',
  onChange,
  placeholder = 'dd/MM/yyyy',
  required = false,
  disabled = false,
  error,
  className = '',
  id,
  minDate,
  maxDate,
}: DateInputVNProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [isValid, setIsValid] = useState(true)

  // Convert ISO date to Vietnamese format (dd/MM/yyyy)
  const isoToVietnamese = (isoDate: string): string => {
    if (!isoDate) return ''
    try {
      const date = new Date(isoDate)
      if (isNaN(date.getTime())) return ''
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString()
      
      return `${day}/${month}/${year}`
    } catch {
      return ''
    }
  }

  // Convert Vietnamese format to ISO date
  const vietnameseToIso = (vnDate: string): string => {
    if (!vnDate) return ''
    
    // Remove any non-digit and non-slash characters
    const cleaned = vnDate.replace(/[^\d/]/g, '')
    
    // Match dd/MM/yyyy pattern
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!match) return ''
    
    const [, day, month, year] = match
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    
    // Basic validation
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      return ''
    }
    
    try {
      // Create date object and validate it's a real date
      const date = new Date(yearNum, monthNum - 1, dayNum)
      if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
        return ''
      }
      
      // Return ISO format (YYYY-MM-DD)
      return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  // Validate date against min/max constraints
  const validateDateRange = (isoDate: string): boolean => {
    if (!isoDate) return true
    
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return false
    
    if (minDate) {
      const min = new Date(minDate)
      if (date < min) return false
    }
    
    if (maxDate) {
      const max = new Date(maxDate)
      if (date > max) return false
    }
    
    return true
  }

  // Initialize display value from prop
  useEffect(() => {
    if (value) {
      // Check if value is already in Vietnamese format
      if (value.includes('/')) {
        setDisplayValue(value)
      } else {
        // Convert from ISO to Vietnamese
        setDisplayValue(isoToVietnamese(value))
      }
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleInputChange = (inputValue: string) => {
    setDisplayValue(inputValue)
    
    // Try to convert to ISO and validate
    const isoDate = vietnameseToIso(inputValue)
    const isValidDate = isoDate !== ''
    const isInRange = validateDateRange(isoDate)
    const valid = isValidDate && isInRange
    
    setIsValid(valid || inputValue === '') // Empty is valid unless required
    
    // Only call onChange with valid dates
    if (valid && onChange) {
      onChange(isoDate)
    } else if (inputValue === '' && onChange) {
      onChange('')
    }
  }

  const handleInputBlur = () => {
    // Format the date on blur if it's valid
    const isoDate = vietnameseToIso(displayValue)
    if (isoDate) {
      const formatted = isoToVietnamese(isoDate)
      setDisplayValue(formatted)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Allow numbers, slashes, and control keys
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight']
    if (allowedKeys.includes(e.key)) return
    
    if (!/[\d/]/.test(e.key)) {
      e.preventDefault()
    }
  }

  const getValidationMessage = (): string => {
    if (!displayValue) return ''
    
    const isoDate = vietnameseToIso(displayValue)
    if (!isoDate) return 'Invalid date format. Use dd/MM/yyyy'
    
    if (!validateDateRange(isoDate)) {
      if (minDate && maxDate) {
        return `Date must be between ${isoToVietnamese(minDate)} and ${isoToVietnamese(maxDate)}`
      } else if (minDate) {
        return `Date must be after ${isoToVietnamese(minDate)}`
      } else if (maxDate) {
        return `Date must be before ${isoToVietnamese(maxDate)}`
      }
    }
    
    return ''
  }

  const validationError = error || getValidationMessage()
  const hasError = !!validationError || (!isValid && displayValue !== '')

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
      </div>
      {hasError && (
        <p className="mt-1 text-sm text-red-600">{validationError}</p>
      )}
      {!hasError && displayValue && (
        <p className="mt-1 text-xs text-gray-500">
          Format: dd/MM/yyyy (e.g., 15/03/2024)
        </p>
      )}
    </div>
  )
}