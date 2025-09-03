'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export default function Settings() {
  const [language, setLanguage] = useState('en')
  const [theme, setTheme] = useState('light')

  const handleSave = () => {
    alert('Cài đặt đã được lưu!')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-600 mt-1">
          Quản lý cài đặt ứng dụng của bạn
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngôn ngữ
          </label>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">Tiếng Anh</option>
            <option value="vi">Tiếng Việt</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giao diện
          </label>
          <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </div>
      </div>
    </div>
  )
}
