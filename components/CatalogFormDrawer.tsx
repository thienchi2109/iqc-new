'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import CustomSelect from '@/components/ui/CustomSelect'
import { Textarea } from '@/components/ui/textarea'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'email' | 'password'
  required?: boolean
  placeholder?: string
  options?: { value: string | number; label: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
  defaultValue?: any
  disabled?: boolean
  description?: string
}

export interface CatalogFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  fields: FormField[]
  onSubmit: (data: Record<string, any>) => Promise<void> | void
  initialData?: Record<string, any>
  isLoading?: boolean
  submitButtonText?: string
  cancelButtonText?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function CatalogFormDrawer({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  initialData = {},
  isLoading = false,
  submitButtonText = 'Save',
  cancelButtonText = 'Cancel',
  size = 'md',
}: CatalogFormDrawerProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when drawer opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const newFormData: Record<string, any> = {}
      fields.forEach(field => {
        newFormData[field.name] = initialData[field.name] ?? field.defaultValue ?? ''
      })
      setFormData(newFormData)
      setErrors({})
    }
  }, [isOpen, initialData, fields])

  const validateField = (field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null
    }

    // Type-specific validations
    if (field.type === 'number') {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return `${field.label} must be a valid number`
      }
      if (field.validation?.min !== undefined && numValue < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`
      }
      if (field.validation?.max !== undefined && numValue > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`
      }
    }

    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return `${field.label} must be a valid email address`
      }
    }

    // Pattern validation
    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(value)) {
        return `${field.label} format is invalid`
      }
    }

    // Custom validation
    if (field.validation?.custom) {
      return field.validation.custom(value)
    }

    return null
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    fields.forEach(field => {
      const error = validateField(field, formData[field.name])
      if (error) {
        newErrors[field.name] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
      // Handle submission errors here
    } finally {
      setIsSubmitting(false)
    }
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  const renderField = (field: FormField) => {
    const value = formData[field.name] || ''
    const error = errors[field.name]
    const fieldId = `field-${field.name}`

    const baseInputClasses = `w-full ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`

    switch (field.type) {
      case 'select':
        return (
          <CustomSelect
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(val) => {
              const original = field.options?.find((o) => String(o.value) === val)
              handleFieldChange(field.name, original ? original.value : val)
            }}
            options={(field.options || []).map((o) => ({ value: String(o.value), label: o.label }))}
            placeholder={field.placeholder || `Select ${field.label}`}
            disabled={field.disabled || isSubmitting}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || isSubmitting}
            className={baseInputClasses}
            rows={4}
          />
        )

      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || isSubmitting}
            className={baseInputClasses}
            min={field.validation?.min}
            max={field.validation?.max}
            step="any"
          />
        )

      default:
        return (
          <Input
            id={fieldId}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || isSubmitting}
            className={baseInputClasses}
          />
        )
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ${sizeClasses[size]} w-full`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {fields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                    )}
                    {field.description && (
                      <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {cancelButtonText}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex items-center gap-2"
                >
                  {(isSubmitting || isLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitButtonText}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
