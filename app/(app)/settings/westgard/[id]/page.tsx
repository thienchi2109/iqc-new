'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { type RuleConfigSchema } from '@/lib/qc/rules.schema'

interface EnhancedRuleConfig extends RuleConfigSchema {}

interface RuleProfile {
  id: string
  name: string
  enabledRules: {
    window_size_default: number
    rules: Record<string, EnhancedRuleConfig>
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

const DEFAULT_RULES: Record<string, EnhancedRuleConfig> = {
  '1-3s': { 
    enabled: true, 
    severity: 'fail',
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false
  },
  '1-2s': { 
    enabled: true, 
    severity: 'warn',
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false
  },
  '2-2s': { 
    enabled: true, 
    severity: 'fail',
    required_levels: '1',
    scope: 'either',
    within_run_across_levels: true,
    across_runs: true,
    threshold_sd: 2
  },
  'R-4s': { 
    enabled: true, 
    severity: 'fail',
    required_levels: '2',
    scope: 'across_levels',
    within_run_across_levels: true, 
    across_runs: true, 
    delta_sd: 4 
  },
  '4-1s': { 
    enabled: true, 
    severity: 'fail', 
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false,
    threshold_sd: 1, 
    window: 4 
  },
  '10x': { 
    enabled: true, 
    severity: 'fail', 
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false,
    n: 10 
  },
  '7T': { 
    enabled: true, 
    severity: 'fail', 
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false,
    n: 7 
  },
  'Nx_ext': {
    enabled: true,
    severity: 'fail',
    required_levels: '1',
    scope: 'across_levels_or_time',
    within_run_across_levels: false,
    across_runs: true,
    n_set: [8, 9, 10, 12],
    window: 24
  },
  '2of3-2s': { 
    enabled: false, 
    severity: 'fail', 
    required_levels: '3',
    scope: 'across_levels',
    within_run_across_levels: true,
    across_runs: true,
    threshold_sd: 2, 
    window: 3 
  },
  '3-1s': { 
    enabled: false, 
    severity: 'fail', 
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false,
    threshold_sd: 1, 
    window: 3 
  },
  '6x': { 
    enabled: false, 
    severity: 'fail', 
    required_levels: '1',
    scope: 'within_level',
    within_run_across_levels: false,
    across_runs: false,
    n: 6 
  }
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  '1-3s': 'Một điểm ngoài ±3SD',
  '1-2s': 'Một điểm ngoài ±2SD', 
  '2-2s': 'Hai điểm liên tiếp cùng phía ngoài ±2SD (trong cùng mức hoặc giữa các mức)',
  'R-4s': 'Phạm vi giữa các mức vượt quá SD cấu hình',
  '4-1s': 'Bốn điểm liên tiếp cùng phía ngoài ±1SD',
  '10x': 'Mười điểm liên tiếp cùng phía với giá trị trung bình',
  '7T': 'Bảy điểm liên tiếp có xu hướng tăng hoặc giảm',
  'Nx_ext': 'Quy tắc mở rộng Nx với bộ giá trị n có thể cấu hình [8,9,10,12]',
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
  rule: EnhancedRuleConfig
  onChange: (newRule: EnhancedRuleConfig) => void 
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
        <div className="space-y-4">
          {/* First Row: Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
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

            {/* Required Levels */}
            <div>
              <Label className="text-xs">Yêu cầu số mức 📝</Label>
              <select
                value={rule.required_levels || '1'}
                onChange={(e) => onChange({ ...rule, required_levels: e.target.value as '1' | '2' | '3' })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
                title="Số mức tối thiểu cần thiết để áp dụng quy tắc này"
              >
                <option value="1">1 mức</option>
                <option value="2">2 mức</option>
                <option value="3">3 mức</option>
              </select>
            </div>

            {/* Scope */}
            <div>
              <Label className="text-xs">Phạm vi áp dụng 📝</Label>
              <select
                value={rule.scope || 'within_level'}
                onChange={(e) => onChange({ ...rule, scope: e.target.value as 'within_level' | 'across_levels' | 'either' | 'across_levels_or_time' })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
                title="Xác định quy tắc hoạt động trong cùng mức hay giữa các mức"
              >
                <option value="within_level">Trong cùng mức</option>
                <option value="across_levels">Giữa các mức</option>
                <option value="either">Cả hai</option>
                <option value="across_levels_or_time">Giữa mức hoặc thời gian</option>
              </select>
            </div>

            {/* Cross-run behavior for applicable rules */}
            {(ruleCode === '2-2s' || ruleCode === 'R-4s') && (
              <div className="flex items-center pt-6">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={rule.within_run_across_levels || false}
                    onChange={(e) => onChange({ ...rule, within_run_across_levels: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title="Cho phép phát hiện quy tắc giữa các mức trong cùng lần chạy"
                  />
                  <span className="ml-2">Giữa mức trong chạy</span>
                </label>
              </div>
            )}
          </div>

          {/* Second Row: Rule-specific parameters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Threshold SD */}
            {(ruleCode === '4-1s' || ruleCode === '3-1s' || ruleCode === '2of3-2s' || ruleCode === '2-2s') && (
              <div>
                <Label className="text-xs">Ngưỡng SD</Label>
                <Input
                  type="number"
                  value={rule.threshold_sd || (ruleCode === '2-2s' ? 2 : 1)}
                  onChange={(e) => onChange({ ...rule, threshold_sd: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0.1"
                  className="text-sm"
                />
              </div>
            )}

            {/* Window */}
            {(ruleCode === '4-1s' || ruleCode === '3-1s' || ruleCode === '2of3-2s' || ruleCode === '2-2s' || ruleCode === 'Nx_ext') && (
              <div>
                <Label className="text-xs">Cửa sổ {ruleCode === 'Nx_ext' ? '(mở rộng)' : ''}</Label>
                <Input
                  type="number"
                  value={rule.window || (ruleCode === '4-1s' ? 4 : ruleCode === '3-1s' ? 3 : ruleCode === 'Nx_ext' ? 24 : 2)}
                  onChange={(e) => onChange({ ...rule, window: parseInt(e.target.value) })}
                  min="1"
                  className="text-sm"
                />
              </div>
            )}

            {/* N (single value) */}
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

            {/* Delta SD for R-4s */}
            {ruleCode === 'R-4s' && (
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
            )}

            {/* Across runs checkbox */}
            {(ruleCode === '2-2s' || ruleCode === 'R-4s') && (
              <div className="flex items-center pt-6">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={rule.across_runs || false}
                    onChange={(e) => onChange({ ...rule, across_runs: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title="Cho phép phát hiện quy tắc giữa các lần chạy khác nhau"
                  />
                  <span className="ml-2">Giữa các chạy</span>
                </label>
              </div>
            )}
          </div>

          {/* Third Row: N_set for Nx_ext */}
          {ruleCode === 'Nx_ext' && (
            <div className="border-t border-gray-100 pt-3">
              <Label className="text-xs">Bộ giá trị N (tách bởi dấu phẩy) 📝</Label>
              <Input
                type="text"
                value={(rule.n_set || [8, 9, 10, 12]).join(', ')}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0)
                  onChange({ ...rule, n_set: values })
                }}
                placeholder="8, 9, 10, 12"
                className="text-sm"
                title="Danh sách các giá trị N để kiểm tra (ví dụ: 8,9,10,12)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quy tắc sẽ kiểm tra tất cả các giá trị n trong danh sách này
              </p>
            </div>
          )}

          {/* Help text for complex rules */}
          {(rule.required_levels === '2' || rule.required_levels === '3') && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              ⚠️ Quy tắc này yêu cầu ít nhất {rule.required_levels} mức. Nếu lần chạy không có đủ số mức, quy tắc sẽ bị bỏ qua.
            </div>
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

  const handleRuleChange = (ruleCode: string, newRule: EnhancedRuleConfig) => {
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
      toast.error('JSON không hợp lệ: ' + (error as Error).message)
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
