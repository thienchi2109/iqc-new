'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'

interface RuleProfile {
  id: string
  name: string
  enabledRules: {
    window_size_default: number
    rules: Record<string, {
      enabled: boolean
      severity?: 'warn' | 'fail'
      [key: string]: any
    }>
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

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

async function fetchRuleProfiles(): Promise<RuleProfile[]> {
  const response = await fetch('/api/rule-profiles')
  if (!response.ok) {
    throw new Error('Không thể tải danh sách rule profile')
  }
  return response.json()
}

async function fetchProfileBindings(profileId: string): Promise<RuleProfileBinding[]> {
  const response = await fetch(`/api/rule-profiles/${profileId}/bindings`)
  if (!response.ok) {
    throw new Error('Không thể tải danh sách binding')
  }
  return response.json()
}

function RulesSummary({ rules }: { rules: RuleProfile['enabledRules']['rules'] }) {
  const enabledRules = Object.entries(rules).filter(([_, rule]) => rule.enabled)
  const disabledRules = Object.entries(rules).filter(([_, rule]) => !rule.enabled)
  
  return (
    <div className="text-sm">
      <div className="text-green-600 font-medium mb-1">
        Bật ({enabledRules.length}): {enabledRules.map(([code]) => code).join(', ')}
      </div>
      {disabledRules.length > 0 && (
        <div className="text-gray-500">
          Tắt ({disabledRules.length}): {disabledRules.map(([code]) => code).join(', ')}
        </div>
      )}
    </div>
  )
}

function ProfileBindings({ profileId }: { profileId: string }) {
  const { data: bindings, isLoading } = useQuery({
    queryKey: ['profile-bindings', profileId],
    queryFn: () => fetchProfileBindings(profileId),
  })

  if (isLoading) {
    return <span className="text-xs text-gray-500">Đang tải...</span>
  }

  if (!bindings || bindings.length === 0) {
    return <span className="text-xs text-gray-500">Chưa có binding</span>
  }

  return (
    <div className="text-xs space-y-1">
      {bindings.map((binding) => (
        <div key={binding.id} className="text-gray-600">
          <span className="font-medium capitalize">{binding.scopeType}</span>
          {binding.testName && <span> • Test: {binding.testName}</span>}
          {binding.deviceName && <span> • Thiết bị: {binding.deviceName}</span>}
        </div>
      ))}
    </div>
  )
}

export default function WestgardSettings() {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['rule-profiles'],
    queryFn: fetchRuleProfiles,
  })

  // Filter profiles based on search term
  const filteredProfiles = profiles?.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleCreateNew = () => {
    router.push('/settings/westgard/new')
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h3 className="text-red-800 font-semibold">Có lỗi xảy ra</h3>
          <p className="text-red-600 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quy tắc Westgard</h1>
          <p className="text-gray-600 mt-1">
            Quản lý cấu hình quy tắc Westgard cho các thiết bị và xét nghiệm
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          Tạo rule profile mới
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <div className="flex space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Tìm kiếm theo tên rule profile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Profile List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Rule Profiles ({filteredProfiles.length})
            </h2>
            <div className="text-sm text-gray-500">
              USE_PROFILE_CONFIG = {process.env.USE_PROFILE_CONFIG === 'true' ? 'BẬT' : 'TẮT'}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="text-gray-500">Đang tải danh sách rule profiles...</div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-500 mb-4">
              {searchTerm ? 'Không tìm thấy rule profile nào phù hợp.' : 'Chưa có rule profile nào.'}
            </div>
            {!searchTerm && (
              <Button onClick={handleCreateNew}>
                Tạo rule profile đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.name}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Window: {profile.enabledRules.window_size_default || 12}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <RulesSummary rules={profile.enabledRules.rules} />
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Phạm vi áp dụng:</div>
                        <ProfileBindings profileId={profile.id} />
                      </div>
                      
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Tạo: {new Date(profile.createdAt).toLocaleDateString('vi-VN', { 
                          timeZone: 'Asia/Ho_Chi_Minh' 
                        })}</span>
                        <span>Cập nhật: {new Date(profile.updatedAt).toLocaleDateString('vi-VN', { 
                          timeZone: 'Asia/Ho_Chi_Minh' 
                        })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link href={`/settings/westgard/${profile.id}`}>
                        Chỉnh sửa
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link href={`/settings/westgard/${profile.id}/bindings`}>
                        Quản lý binding
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="text-blue-800 font-semibold mb-2">Hướng dẫn sử dụng</h3>
        <div className="text-blue-700 text-sm space-y-2">
          <p>• <strong>Rule Profile</strong>: Một bộ cấu hình quy tắc Westgard có thể áp dụng cho nhiều thiết bị/xét nghiệm</p>
          <p>• <strong>Binding</strong>: Xác định phạm vi áp dụng của rule profile (global, thiết bị, xét nghiệm, hoặc kết hợp)</p>
          <p>• <strong>Ưu tiên</strong>: device_test &gt; test &gt; device &gt; global</p>
          <p>• <strong>Feature Flag</strong>: Khi USE_PROFILE_CONFIG=false, hệ thống sẽ sử dụng quy tắc mặc định</p>
        </div>
      </div>
    </div>
  )
}
