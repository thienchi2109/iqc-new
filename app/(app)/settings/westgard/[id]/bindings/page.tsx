'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface RuleProfileBinding {
  id: string
  profileId: string
  scopeType: 'global' | 'test' | 'device' | 'device_test'
  testId?: string
  testName?: string
  deviceId?: string
  deviceName?: string
  activeFrom: string
  activeTo?: string
}

interface Device {
  id: string
  code: string
  name: string
}

interface Test {
  id: string
  code: string
  name: string
}

async function fetchProfileBindings(profileId: string): Promise<RuleProfileBinding[]> {
  const response = await fetch(`/api/rule-profiles/${profileId}/bindings`)
  if (!response.ok) {
    throw new Error('Không thể tải danh sách binding')
  }
  return response.json()
}

async function fetchDevices(): Promise<Device[]> {
  const response = await fetch('/api/devices?isActive=true')
  if (!response.ok) {
    throw new Error('Không thể tải danh sách thiết bị')
  }
  return response.json()
}

async function fetchTests(): Promise<Test[]> {
  const response = await fetch('/api/tests?isActive=true')
  if (!response.ok) {
    throw new Error('Không thể tải danh sách xét nghiệm')
  }
  return response.json()
}

async function createBinding(profileId: string, data: any): Promise<RuleProfileBinding> {
  const response = await fetch(`/api/rule-profiles/${profileId}/bindings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Không thể tạo binding')
  }
  return response.json()
}

function CreateBindingForm({ 
  profileId, 
  onSuccess 
}: { 
  profileId: string
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    scopeType: 'global' as 'global' | 'test' | 'device' | 'device_test',
    testId: '',
    deviceId: '',
    activeFrom: new Date().toISOString().slice(0, 16),
    activeTo: ''
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,
  })

  const { data: tests } = useQuery({
    queryKey: ['tests'],
    queryFn: fetchTests,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createBinding(profileId, data),
    onSuccess: () => {
      onSuccess()
      setFormData({
        scopeType: 'global',
        testId: '',
        deviceId: '',
        activeFrom: new Date().toISOString().slice(0, 16),
        activeTo: ''
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData: any = {
      scopeType: formData.scopeType,
      activeFrom: formData.activeFrom,
    }

    if (formData.activeTo) {
      submitData.activeTo = formData.activeTo
    }

    if (formData.scopeType === 'test' || formData.scopeType === 'device_test') {
      submitData.testId = formData.testId
    }

    if (formData.scopeType === 'device' || formData.scopeType === 'device_test') {
      submitData.deviceId = formData.deviceId
    }

    createMutation.mutate(submitData)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tạo Binding mới</h3>
      
      {createMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="text-red-800 text-sm">{createMutation.error.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="scopeType">Phạm vi áp dụng</Label>
            <select
              id="scopeType"
              value={formData.scopeType}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                scopeType: e.target.value as any,
                testId: '',
                deviceId: ''
              }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="global">Toàn cục</option>
              <option value="test">Xét nghiệm cụ thể</option>
              <option value="device">Thiết bị cụ thể</option>
              <option value="device_test">Thiết bị + Xét nghiệm</option>
            </select>
          </div>

          {(formData.scopeType === 'test' || formData.scopeType === 'device_test') && (
            <div>
              <Label htmlFor="testId">Xét nghiệm</Label>
              <select
                id="testId"
                value={formData.testId}
                onChange={(e) => setFormData(prev => ({ ...prev, testId: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Chọn xét nghiệm...</option>
                {tests?.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.code} - {test.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(formData.scopeType === 'device' || formData.scopeType === 'device_test') && (
            <div>
              <Label htmlFor="deviceId">Thiết bị</Label>
              <select
                id="deviceId"
                value={formData.deviceId}
                onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Chọn thiết bị...</option>
                {devices?.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.code} - {device.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="activeFrom">Có hiệu lực từ</Label>
            <Input
              id="activeFrom"
              type="datetime-local"
              value={formData.activeFrom}
              onChange={(e) => setFormData(prev => ({ ...prev, activeFrom: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="activeTo">Có hiệu lực đến (tùy chọn)</Label>
            <Input
              id="activeTo"
              type="datetime-local"
              value={formData.activeTo}
              onChange={(e) => setFormData(prev => ({ ...prev, activeTo: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo binding'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ProfileBindingsPage() {
  const params = useParams()
  const profileId = params.id as string
  const queryClient = useQueryClient()

  const { data: bindings, isLoading, error } = useQuery({
    queryKey: ['profile-bindings', profileId],
    queryFn: () => fetchProfileBindings(profileId),
  })

  const handleBindingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['profile-bindings', profileId] })
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h3 className="text-red-800 font-semibold">Có lỗi xảy ra</h3>
          <p className="text-red-600 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Binding</h1>
          <p className="text-gray-600 mt-1">
            Xác định phạm vi áp dụng cho rule profile
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/westgard">Quay lại</Link>
        </Button>
      </div>

      {/* Create Form */}
      <CreateBindingForm 
        profileId={profileId}
        onSuccess={handleBindingSuccess}
      />

      {/* Existing Bindings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Binding hiện tại ({bindings?.length || 0})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="text-gray-500">Đang tải danh sách binding...</div>
          </div>
        ) : !bindings || bindings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-500">Chưa có binding nào.</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bindings.map((binding) => (
              <div key={binding.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {binding.scopeType}
                      </span>
                      {binding.testName && (
                        <span className="text-sm text-gray-600">
                          Xét nghiệm: <strong>{binding.testName}</strong>
                        </span>
                      )}
                      {binding.deviceName && (
                        <span className="text-sm text-gray-600">
                          Thiết bị: <strong>{binding.deviceName}</strong>
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 space-x-4">
                      <span>
                        Từ: {new Date(binding.activeFrom).toLocaleString('vi-VN', { 
                          timeZone: 'Asia/Ho_Chi_Minh' 
                        })}
                      </span>
                      {binding.activeTo && (
                        <span>
                          Đến: {new Date(binding.activeTo).toLocaleString('vi-VN', { 
                            timeZone: 'Asia/Ho_Chi_Minh' 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Future: Add edit/delete functionality */}
                    <span className="text-xs text-green-600 font-medium">Hoạt động</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Priority Help */}
      <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
        <h3 className="text-yellow-800 font-semibold mb-2">Thứ tự ưu tiên</h3>
        <div className="text-yellow-700 text-sm space-y-1">
          <p><strong>1. device_test</strong> - Ưu tiên cao nhất (thiết bị + xét nghiệm cụ thể)</p>
          <p><strong>2. test</strong> - Áp dụng cho xét nghiệm cụ thể trên mọi thiết bị</p>
          <p><strong>3. device</strong> - Áp dụng cho thiết bị cụ thể với mọi xét nghiệm</p>
          <p><strong>4. global</strong> - Ưu tiên thấp nhất, áp dụng chung cho tất cả</p>
        </div>
      </div>
    </div>
  )
}
