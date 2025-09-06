'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface SimpleSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * SimpleSelect - A CSS-only dropdown component that's immune to layout changes
 * Uses relative/absolute positioning instead of JavaScript calculations
 */
export default function SimpleSelect({ options, value, onChange, placeholder, disabled, className }: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className || ''}`} ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`ml-2 h-4 w-4 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {/* CSS-only dropdown menu - no JavaScript positioning! */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm max-h-60 border border-gray-200">
          {options.map(option => (
            <div
              key={option.value}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${
                option.value === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
              }`}
              role="option"
              aria-selected={option.value === value}
            >
              <span className="block truncate">{option.label}</span>
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}