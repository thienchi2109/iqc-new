'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import CustomSelect from '@/components/ui/CustomSelect'
import { Card } from '@/components/ui/card'

interface CatalogItem {
  name: string
  href: string
  description: string
  icon: string
}

const catalogItems: CatalogItem[] = [
  { name: 'Xét nghiệm', href: '/settings/catalog/tests', description: 'Quản lý các xét nghiệm và chất phân tích', icon: '🧪' },
  { name: 'Thiết bị', href: '/settings/catalog/devices', description: 'Quản lý thiết bị phòng xét nghiệm và máy phân tích', icon: '🧫' },
  { name: 'Đơn vị', href: '/settings/catalog/units', description: 'Quản lý đơn vị đo', icon: '📐' },
  { name: 'Phương pháp', href: '/settings/catalog/methods', description: 'Quản lý phương pháp phân tích', icon: '⚙️' },
  { name: 'Mức QC', href: '/settings/catalog/qc-levels', description: 'Quản lý mức kiểm soát chất lượng (L1, L2, L3)', icon: '📊' },
  { name: 'Lô QC', href: '/settings/catalog/qc-lots', description: 'Quản lý lô và đợt kiểm soát chất lượng', icon: '🏷️' },
  { name: 'Giới hạn QC', href: '/settings/catalog/qc-limits', description: 'Quản lý giới hạn thống kê QC (trung bình, SD, CV)', icon: '📈' },
]

export default function Settings() {
  const [language, setLanguage] = useState('en')
  const [theme, setTheme] = useState('light')

  const handleSave = () => {
    toast.success('Cài đặt đã được lưu!')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-600 mt-1">
          Quản lý cài đặt ứng dụng và danh mục dữ liệu chính
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cài đặt ứng dụng */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cài đặt ứng dụng</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngôn ngữ</label>
              <CustomSelect
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'vi', label: 'Tiếng Việt' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giao diện</label>
              <CustomSelect
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave}>Lưu thay đổi</Button>
            </div>
          </div>
        </Card>

        {/* Danh mục dữ liệu chính */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Danh mục dữ liệu chính</h2>
          <p className="text-sm text-gray-600 mb-4">
            Quản lý dữ liệu chính của phòng xét nghiệm bao gồm xét nghiệm, thiết bị, đơn vị, phương pháp và các tham số QC.
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
                  <div className="font-medium text-gray-900 group-hover:text-blue-700">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

