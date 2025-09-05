'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/card'

interface CatalogItem {
  name: string
  href: string
  description: string
  icon: string
}

const catalogItems: CatalogItem[] = [
  {
    name: 'Tests',
    href: '/settings/catalog/tests',
    description: 'Manage laboratory tests and analytes',
    icon: '🧪'
  },
  {
    name: 'Devices',
    href: '/settings/catalog/devices',
    description: 'Manage laboratory instruments and analyzers',
    icon: '🧨'
  },
  {
    name: 'Units',
    href: '/settings/catalog/units',
    description: 'Manage measurement units',
    icon: '📏'
  },
  {
    name: 'Methods',
    href: '/settings/catalog/methods',
    description: 'Manage analytical methods',
    icon: '⚙️'
  },
  {
    name: 'QC Levels',
    href: '/settings/catalog/qc-levels',
    description: 'Manage quality control levels (L1, L2, L3)',
    icon: '🔴'
  },
  {
    name: 'QC Lots',
    href: '/settings/catalog/qc-lots',
    description: 'Manage quality control lots and batches',
    icon: '📦'
  },
  {
    name: 'QC Limits',
    href: '/settings/catalog/qc-limits',
    description: 'Manage QC statistical limits (mean, SD, CV)',
    icon: '📉'
  }
]

export default function Settings() {
  const [language, setLanguage] = useState('en')
  const [theme, setTheme] = useState('light')

  const handleSave = () => {
    alert('Settings have been saved!')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your application settings and master data catalogs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Theme
              </label>
              <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </Card>

        {/* Master Data Catalog */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Master Data Catalog</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manage laboratory master data including tests, devices, units, methods, and QC parameters.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {catalogItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150 group"
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-blue-700">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
