'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function CustomSelect({ options, value, onChange, placeholder, disabled, className }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => setIsClient(true), [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const updatePosition = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
    }
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

  return (
    <div className={`relative ${className || ''}`} ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className="ml-2 h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {isClient && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm max-h-60"
          style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
          role="listbox"
        >
          {options.map(option => (
            <div
              key={option.value}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(option.value)
                setIsOpen(false)
              }}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
              role="option"
              aria-selected={option.value === value}
            >
              <span className="block truncate">{option.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
