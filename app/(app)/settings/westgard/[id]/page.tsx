'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface RuleConfig {
  enabled: boolean
  severity?: 'warn' | 'fail'
  threshold_sd?: number
  window?: number
  n?: number
  within_run_across_levels?: boolean
  across_runs?: boolean
  delta_sd?: number
}

interface RuleProfile {
  id: string
  name: string
  enabledRules: {
    window_size_default: number
    rules: Record<string, RuleConfig>
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

const DEFAULT_RULES: Record<string, RuleConfig> = {
  '1-3s': { enabled: true, severity: 'fail' },
  '1-2s': { enabled: true, severity: 'warn' },
  '2-2s': { enabled: true, severity: 'fail' },
  'R-4s': { 
    enabled: true, 
    severity: 'fail',
    within_run_across_levels: true, 
    across_runs: true, 
    delta_sd: 4 
  },
  '4-1s': { enabled: true, severity: 'fail', threshold_sd: 1, window: 4 },
  '10x': { enabled: true, severity: 'fail', n: 10 },
  '7T': { enabled: true, severity: 'fail', n: 7 },
  '2of3-2s': { enabled: false, severity: 'fail', threshold_sd: 2, window: 3 },
  '3-1s': { enabled: false, severity: 'fail', threshold_sd: 1, window: 3 },
  '6x': { enabled: false, severity: 'fail', n: 6 }
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  '1-3s': 'Một điểm ngoài ±3SD',
  '1-2s': 'Một điểm ngoài ±2SD', 
  '2-2s': 'Hai điểm liên tiếp cùng phía ngoài ±2SD',
  'R-4s': 'Phạm vi giữa các mức vượt quá 4SD',
  '4-1s': 'Bốn điểm liên tiếp cùng phía ngoài ±1SD',
  '10x': 'Mười điểm liên tiếp cùng phía với giá trị trung bình',
  '7T': 'Bảy điểm liên tiếp có xu hướng tăng hoặc giảm',
  '2of3-2s': 'Hai trong ba mức ngoài ±2SD',
  '3-1s': 'Ba điểm liên tiếp cùng phía ngoài ±1SD',
  '6x': 'Sáu điểm liên tiếp cùng phía với giá trị trung bình'
}

async function fetchRuleProfile(id: string): Promise<RuleProfile> {
  const response = await fetch(`/api/rule-profiles/${id}`)
  if (!response.ok) {
    throw new Error('Không thể tải rule profile')
  }
  return response.json()
}

async function createRuleProfile(data: { name: string; enabledRules: any }): Promise<RuleProfile> {
  const response = await fetch('/api/rule-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Không thể tạo rule profile')
  }
  return response.json()
}

async function updateRuleProfile(id: string, data: { name: string; enabledRules: any }): Promise<RuleProfile> {
  const response = await fetch(`/api/rule-profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Không thể cập nhật rule profile')
  }
  return response.json()
}

function RuleEditor({ 
  ruleCode, 
  rule, 
  onChange 
}: { 
  ruleCode: string
  rule: RuleConfig
  onChange: (newRule: RuleConfig) => void 
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{ruleCode}</h4>
          <p className="text-sm text-gray-600">{RULE_DESCRIPTIONS[ruleCode]}</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm">Bật</span>
        </label>
      </div>

      {rule.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          {/* Severity */}
          <div>
            <Label className="text-xs">Mức độ nghiêm trọng</Label>
            <select
              value={rule.severity || 'fail'}
              onChange={(e) => onChange({ ...rule, severity: e.target.value as 'warn' | 'fail' })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="warn">Cảnh báo</option>
              <option value="fail">Lỗi</option>
            </select>
          </div>

          {/* Rule-specific parameters */}
          {(ruleCode === '4-1s' || ruleCode === '3-1s' || ruleCode === '2of3-2s') && (
            <div>
              <Label className="text-xs">Ngưỡng SD</Label>
              <Input
                type="number"
                value={rule.threshold_sd || 1}
                onChange={(e) => onChange({ ...rule, threshold_sd: parseFloat(e.target.value) })}
                step="0.1"
                min="0.1"
                className="text-sm"
              />
            </div>
          )}

          {(ruleCode === '4-1s' || ruleCode === '3-1s' || ruleCode === '2of3-2s') && (
            <div>
              <Label className="text-xs">Cửa sổ</Label>
              <Input
                type="number"
                value={rule.window || (ruleCode === '4-1s' ? 4 : 3)}
                onChange={(e) => onChange({ ...rule, window: parseInt(e.target.value) })}
                min="1"
                className="text-sm"
              />
            </div>
          )}

          {(ruleCode === '10x' || ruleCode === '6x' || ruleCode === '7T') && (
            <div>
              <Label className="text-xs">Số điểm</Label>
              <Input
                type="number"
                value={rule.n || (ruleCode === '10x' ? 10 : ruleCode === '7T' ? 7 : 6)}
                onChange={(e) => onChange({ ...rule, n: parseInt(e.target.value) })}
                min="1"
                className="text-sm"
              />
            </div>
          )}

          {ruleCode === 'R-4s' && (
            <>
              <div>
                <Label className="text-xs">Delta SD</Label>
                <Input
                  type="number"
                  value={rule.delta_sd || 4}
                  onChange={(e) => onChange({ ...rule, delta_sd: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0.1"
                  className="text-sm"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={rule.within_run_across_levels || false}
                    onChange={(e) => onChange({ ...rule, within_run_across_levels: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Trong cùng một lần chạy, giữa các mức</span>
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={rule.across_runs || false}
                    onChange={(e) => onChange({ ...rule, across_runs: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Giữa các lần chạy</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function RuleProfileEditPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const isEditing = params.id !== 'new'
  const profileId = params.id as string

  const [formData, setFormData] = useState({
    name: '',
    windowSizeDefault: 12,
    rules: { ...DEFAULT_RULES }
  })
  const [showJsonEditor, setShowJsonEditor] = useState(false)
  const [jsonValue, setJsonValue] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['rule-profile', profileId],
    queryFn: () => fetchRuleProfile(profileId),
    enabled: isEditing,
  })

  const createMutation = useMutation({
    mutationFn: createRuleProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rule-profiles'] })
      router.push('/settings/westgard')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; enabledRules: any }) => updateRuleProfile(profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rule-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['rule-profile', profileId] })
      router.push('/settings/westgard')
    },
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        windowSizeDefault: profile.enabledRules.window_size_default || 12,
        rules: { ...DEFAULT_RULES, ...profile.enabledRules.rules }
      })
    }
  }, [profile])

  useEffect(() => {
    if (showJsonEditor) {
      setJsonValue(JSON.stringify({
        window_size_default: formData.windowSizeDefault,
        rules: formData.rules
      }, null, 2))
    }
  }, [showJsonEditor, formData])

  const handleRuleChange = (ruleCode: string, newRule: RuleConfig) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleCode]: newRule
      }
    }))
  }

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonValue)
      setFormData(prev => ({
        ...prev,
        windowSizeDefault: parsed.window_size_default || 12,
        rules: { ...DEFAULT_RULES, ...parsed.rules }
      }))
      setShowJsonEditor(false)
    } catch (error) {
      alert('JSON không hợp lệ: ' + (error as Error).message)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const enabledRules = {
      window_size_default: formData.windowSizeDefault,
      rules: formData.rules
    }

    if (isEditing) {
      updateMutation.mutate({
        name: formData.name,
        enabledRules
      })
    } else {
      createMutation.mutate({
        name: formData.name,
        enabledRules
      })
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <div className="text-gray-500">Đang tải rule profile...</div>
      </div>
    )
  }

  const error = createMutation.error || updateMutation.error

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Chỉnh sửa Rule Profile' : 'Tạo Rule Profile mới'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Cập nhật cấu hình quy tắc Westgard' : 'Tạo một bộ quy tắc Westgard mới'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/settings/westgard">Hủy</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-red-800 font-semibold">Có lỗi xảy ra</div>
          <div className="text-red-600 text-sm mt-1">{error.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Thông tin cơ bản</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Tên Rule Profile</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="VD: Strict Quality Control"
                required
              />
            </div>
            <div>
              <Label htmlFor="windowSize">Kích thước cửa sổ mặc định</Label>
              <Input
                id="windowSize"
                type="number"
                value={formData.windowSizeDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, windowSizeDefault: parseInt(e.target.value) }))}
                min="1"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* Rule Configuration */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Cấu hình quy tắc</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowJsonEditor(!showJsonEditor)}
            >
              {showJsonEditor ? 'Chế độ Form' : 'Chế độ JSON'}
            </Button>
          </div>

          {showJsonEditor ? (
            <div className="space-y-4">
              <Label>Cấu hình JSON</Label>
              <textarea
                value={jsonValue}
                onChange={(e) => setJsonValue(e.target.value)}
                className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="Nhập cấu hình JSON..."
              />
              <div className="flex space-x-2">
                <Button type="button" onClick={handleJsonSave} size="sm">
                  Áp dụng JSON
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowJsonEditor(false)}>
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(formData.rules).map(([ruleCode, rule]) => (
                <RuleEditor
                  key={ruleCode}
                  ruleCode={ruleCode}
                  rule={rule}
                  onChange={(newRule) => handleRuleChange(ruleCode, newRule)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/settings/westgard">Hủy</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Tạo mới')}
          </Button>
        </div>
      </form>
    </div>
  )
}
