/**
 * Enhanced Approval Inbox with Tabs for QC Runs and QC Limits Proposals
 * 
 * Features:
 * - Tab-based navigation between QC Runs and QC Limits Proposals
 * - Integrated with existing QC runs approval workflow
 * - Modern shadcn/ui tab interface
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ClipboardList, 
  TrendingUp, 
  Bell,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import QcLimitsProposalsInbox from '@/components/QcLimitsProposalsInbox'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'

// Legacy QC runs approval component (existing functionality)
import QcRunsApprovalLegacy from './legacy-qc-runs-approval'

interface PendingRun {
  id: string
  value: number
  z: number
  autoResult: 'pass' | 'warn' | 'fail' | null
  approvalState: 'pending' | 'approved' | 'rejected'
  deviceCode: string
  deviceName: string
  testCode: string
  testName: string
  level: string
  lotCode: string
  lotExpireDate: string
  performerName: string
  runAt: string
  createdAt: string
  violationCount?: number
  violations?: Array<{
    ruleCode: string
    severity: 'warn' | 'fail'
  }>
}

interface ApprovalAction {
  runId: string
  action: 'approve' | 'reject'
  approvalNote?: string
}

interface RunsResult {
  data: PendingRun[]
  total: number
}

export default function ApprovalInboxPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [selectedRun, setSelectedRun] = useState<PendingRun | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [filters, setFilters] = useState({
    deviceCode: '',
    testCode: '',
    level: '',
    autoResult: '',
    approvalState: 'pending' as '' | 'pending' | 'approved' | 'rejected',
  })
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Bulk selection state (scoped to current page)
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set())
  
  // Bulk operations state
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false)

  // Debounce filters for 300ms to avoid excessive queries
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 300)
    return () => clearTimeout(t)
  }, [filters])

  // Reset selection when page or filters change
  useEffect(() => {
    setSelectedRunIds(new Set())
  }, [page, debouncedFilters])

  // Check if approval gate is enabled
  const useApprovalGate = process.env.NEXT_PUBLIC_USE_APPROVAL_GATE !== 'false'

  // Check user permissions
  const userRole = session?.user?.role
  const canApprove = ['supervisor', 'qaqc', 'admin'].includes(userRole || '')

  // Always call hooks in the same order
  // Fetch pending runs (always call, but conditionally enable)
  const { data: runsResult, isLoading, error, isFetching } = useQuery({
    queryKey: ['pending-runs', debouncedFilters, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        ...(debouncedFilters.approvalState && { approvalState: debouncedFilters.approvalState }),
        ...(debouncedFilters.deviceCode && { deviceCode: debouncedFilters.deviceCode }),
        ...(debouncedFilters.testCode && { testCode: debouncedFilters.testCode }),
        ...(debouncedFilters.level && { level: debouncedFilters.level }),
        ...(debouncedFilters.autoResult && { autoResult: debouncedFilters.autoResult }),
      })
      // Pagination
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))
      params.set('includeCount', 'true')

      const response = await fetch(`/api/qc/runs?${params}`)
      if (!response.ok) {
        throw new Error('Không tải được danh sách chờ duyệt')
      }
      return response.json() as Promise<RunsResult>
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    placeholderData: (prev) => prev, // keep previous data for smoother UX
    enabled: canApprove && useApprovalGate, // Only enable if authorized
  })

  // Approval mutation (always call, but conditionally enable)
  const approvalMutation = useMutation({
    mutationFn: async ({ runId, action, approvalNote }: ApprovalAction) => {
      const response = await fetch(`/api/qc/runs/${runId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approvalNote }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error || (action === 'approve' ? 'Không thể duyệt lần chạy' : 'Không thể từ chối lần chạy')
        )
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.action === 'approve'
          ? 'Duyệt lần chạy QC thành công'
          : 'Từ chối lần chạy QC thành công'
      )
      queryClient.invalidateQueries({ queryKey: ['pending-runs'] })
      queryClient.invalidateQueries({ queryKey: ['qc-runs'] })
      setSelectedRun(null)
      setAction(null)
      setApprovalNote('')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (runIds: string[]) => {
      const response = await fetch('/api/qc/runs/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runIds }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể duyệt hàng loạt')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const { successCount, failureCount, errors } = data
      if (successCount > 0) {
        toast.success(`Đã duyệt thành công ${successCount} lần chạy QC`)
      }
      if (failureCount > 0) {
        toast.warning(`${failureCount} lần chạy không thể duyệt`)
        // Optionally show specific errors in console for debugging
        if (errors?.length > 0) {
          console.warn('Bulk approve errors:', errors)
        }
      }
      queryClient.invalidateQueries({ queryKey: ['pending-runs'] })
      queryClient.invalidateQueries({ queryKey: ['qc-runs'] })
      setSelectedRunIds(new Set())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ runIds, note }: { runIds: string[], note: string }) => {
      const response = await fetch('/api/qc/runs/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runIds, note }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể từ chối hàng loạt')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const { successCount, failureCount, errors } = data
      if (successCount > 0) {
        toast.success(`Đã từ chối thành công ${successCount} lần chạy QC`)
      }
      if (failureCount > 0) {
        toast.warning(`${failureCount} lần chạy không thể từ chối`)
        // Optionally show specific errors in console for debugging
        if (errors?.length > 0) {
          console.warn('Bulk reject errors:', errors)
        }
      }
      queryClient.invalidateQueries({ queryKey: ['pending-runs'] })
      queryClient.invalidateQueries({ queryKey: ['qc-runs'] })
      setSelectedRunIds(new Set())
      setIsBulkRejectModalOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
      setIsBulkRejectModalOpen(false)
    },
  })

  // Bulk selection handlers (must be before keyboard shortcuts)
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Select all pending runs on current page
      const pendingRunIds = runsResult?.data
        .filter(run => run.approvalState === 'pending')
        .map(run => run.id) || []
      setSelectedRunIds(new Set(pendingRunIds))
    } else {
      setSelectedRunIds(new Set())
    }
  }, [runsResult?.data])

  // Keyboard shortcuts (must be before any early returns)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts if we have permission and approval gate is enabled
      if (!canApprove || !useApprovalGate) return
      
      const currentPagePendingRuns = runsResult?.data?.filter(run => run.approvalState === 'pending') || []
      
      // Ctrl/Cmd + A to select all on current page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && currentPagePendingRuns.length > 0) {
        e.preventDefault()
        handleSelectAll(true)
      }
      // Escape to clear selection
      if (e.key === 'Escape' && selectedRunIds.size > 0) {
        setSelectedRunIds(new Set())
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canApprove, useApprovalGate, runsResult?.data, selectedRunIds.size, handleSelectAll])

  // Guard clause for access control (after hooks)
  if (!canApprove || !useApprovalGate) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Không có quyền truy cập</h2>
          <p className="text-gray-600">
            {!useApprovalGate
              ? 'Tính năng quy trình duyệt đang bị tắt.'
              : 'Bạn không có quyền truy cập hộp thư duyệt. Chỉ Giám sát, QA/QC và Quản trị viên được phép duyệt QC.'}
          </p>
        </div>
      </div>
    )
  }

  const handleApprovalAction = (run: PendingRun, actionType: 'approve' | 'reject') => {
    setSelectedRun(run)
    setAction(actionType)
    setApprovalNote('')
  }

  const submitApprovalAction = () => {
    if (!selectedRun || !action) return
    
    if (action === 'reject' && !approvalNote.trim()) {
      toast.error('Cần nhập ghi chú khi từ chối lần chạy')
      return
    }
    
    approvalMutation.mutate({
      runId: selectedRun.id,
      action,
      approvalNote: approvalNote.trim() || undefined,
    })
  }

  const handleSelectRun = (runId: string, checked: boolean) => {
    const newSelection = new Set(selectedRunIds)
    if (checked) {
      newSelection.add(runId)
    } else {
      newSelection.delete(runId)
    }
    setSelectedRunIds(newSelection)
  }

  // Calculate selection state for current page
  const currentPagePendingRuns = runsResult?.data.filter(run => run.approvalState === 'pending') || []
  const selectedPendingCount = currentPagePendingRuns.filter(run => selectedRunIds.has(run.id)).length
  const isAllSelected = currentPagePendingRuns.length > 0 && selectedPendingCount === currentPagePendingRuns.length
  const isPartiallySelected = selectedPendingCount > 0 && selectedPendingCount < currentPagePendingRuns.length

  // Bulk action handlers
  const handleBulkApprove = () => {
    const selectedRunIdsArray = Array.from(selectedRunIds)
    if (selectedRunIdsArray.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lần chạy để duyệt')
      return
    }
    bulkApproveMutation.mutate(selectedRunIdsArray)
  }

  const handleBulkReject = () => {
    if (selectedRunIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một lần chạy để từ chối')
      return
    }
    setIsBulkRejectModalOpen(true)
  }

  const handleBulkRejectConfirm = (note: string) => {
    const selectedRunIdsArray = Array.from(selectedRunIds)
    bulkRejectMutation.mutate({ runIds: selectedRunIdsArray, note })
  }

  const isBulkLoading = bulkApproveMutation.isPending || bulkRejectMutation.isPending

  const getAutoResultBadge = (autoResult: 'pass' | 'warn' | 'fail' | null) => {
    if (!autoResult) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300 flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          CHỜ DUYỆT
        </Badge>
      )
    }

    const variants = {
      pass: 'bg-green-100 text-green-800 border-green-300',
      warn: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      fail: 'bg-red-100 text-red-800 border-red-300',
    }
    
    const icons = {
      pass: <CheckIcon className="h-3 w-3" />,
      warn: <AlertTriangleIcon className="h-3 w-3" />,
      fail: <XIcon className="h-3 w-3" />,
    }
    
    return (
      <Badge className={`${variants[autoResult]} flex items-center gap-1`}>
        {icons[autoResult]}
        {autoResult === 'pass' ? 'ĐẠT' : autoResult === 'warn' ? 'CẢNH BÁO' : 'KHÔNG ĐẠT'}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 animate-spin" />
          <span>Đang tải các mục chờ duyệt...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Lỗi</h2>
          <p className="text-gray-600">Không tải được danh sách chờ duyệt. Vui lòng thử lại.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Duyệt các kết quả QC</h1>
        <p className="text-gray-600 mt-1">Xem xét và duyệt hoặc Từ chối các lần chạy QC đang chờ. Các lần chạy &quot;không đạt&quot; cần CAPA hoặc lần chạy đạt sau đó trước khi duyệt.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="approvalState">Trạng thái duyệt</Label>
            <CustomSelect
              options={[
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'rejected', label: 'Từ chối' },
                { value: '', label: 'Tất cả' },
              ]}
              value={filters.approvalState}
              onChange={(value) => {
                setFilters(prev => ({ ...prev, approvalState: value as '' | 'pending' | 'approved' | 'rejected' }))
                setPage(1)
              }}
              placeholder="Chọn trạng thái"
            />
          </div>
          <div>
            <Label htmlFor="device">Thiết bị</Label>
            <Input
              id="device"
              placeholder="Mã thiết bị..."
              value={filters.deviceCode}
              onChange={(e) => { setFilters(prev => ({ ...prev, deviceCode: e.target.value })); setPage(1) }}
            />
          </div>
          <div>
            <Label htmlFor="test">Xét nghiệm</Label>
            <Input
              id="test"
              placeholder="Mã xét nghiệm..."
              value={filters.testCode}
              onChange={(e) => { setFilters(prev => ({ ...prev, testCode: e.target.value })); setPage(1) }}
            />
          </div>
          <div>
            <Label htmlFor="level">Mức</Label>
            <Input
              id="level"
              placeholder="Mức QC..."
              value={filters.level}
              onChange={(e) => { setFilters(prev => ({ ...prev, level: e.target.value })); setPage(1) }}
            />
          </div>
          <div>
            <Label htmlFor="result">Kết quả tự động</Label>
            <CustomSelect
              options={[
                { value: '', label: 'Tất cả kết quả' },
                { value: 'pass', label: 'Đạt' },
                { value: 'warn', label: 'Cảnh báo' },
                { value: 'fail', label: 'Không đạt' },
              ]}
              value={filters.autoResult}
              onChange={(value) => { setFilters(prev => ({ ...prev, autoResult: value })); setPage(1) }}
              placeholder="Tất cả kết quả"
            />
          </div>
        </div>
      </div>

      {/* Pending Runs Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {debouncedFilters.approvalState === 'approved'
              ? 'Đã duyệt'
              : debouncedFilters.approvalState === 'rejected'
              ? 'Từ chối'
              : debouncedFilters.approvalState === ''
              ? 'Tất cả trạng thái'
              : 'Đang chờ duyệt'}{' '}
            ({runsResult?.total ?? 0})
          </h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {isFetching ? 'Đang làm mới…' : 'Tự động làm mới'}
          </Badge>
        </div>
        <div className="p-6">
          {!runsResult || runsResult.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không có dữ liệu phù hợp</p>
              <p className="text-sm">Điều chỉnh bộ lọc hoặc thử lại</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {(debouncedFilters.approvalState === '' || debouncedFilters.approvalState === 'pending') && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isPartiallySelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Chọn tất cả"
                      />
                    </TableHead>
                  )}
                  <TableHead>Thiết bị</TableHead>
                  <TableHead>Xét nghiệm</TableHead>
                  <TableHead>Mức</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Z-score</TableHead>
                  <TableHead>Kết quả tự động</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Thời gian tạo</TableHead>
                  {(debouncedFilters.approvalState === '' || debouncedFilters.approvalState === 'pending') && (
                    <TableHead>Thao tác</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsResult.data.map((run) => {
                  const isSelected = selectedRunIds.has(run.id)
                  const isProcessing = isBulkLoading && isSelected
                  
                  return (
                    <TableRow 
                      key={run.id} 
                      className={`${isSelected ? 'bg-blue-50 border-blue-200' : ''} ${isProcessing ? 'opacity-60' : ''} transition-colors`}
                    >
                      {(debouncedFilters.approvalState === '' || debouncedFilters.approvalState === 'pending') && (
                        <TableCell>
                          {run.approvalState === 'pending' ? (
                            <input
                              type="checkbox"
                              checked={selectedRunIds.has(run.id)}
                              onChange={(e) => handleSelectRun(run.id, e.target.checked)}
                              disabled={isBulkLoading}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              aria-label={`Chọn ${run.deviceCode} - ${run.testCode}`}
                            />
                          ) : null}
                        </TableCell>
                      )}
                    <TableCell>
                      <div>
                        <div className="font-medium">{run.deviceCode}</div>
                        <div className="text-sm text-gray-500">{run.deviceName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{run.testCode}</div>
                        <div className="text-sm text-gray-500">{run.testName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{run.level}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{run.value}</TableCell>
                    <TableCell className="font-mono">{run.z != null ? run.z.toFixed(2) : 'N/A'}</TableCell>
                    <TableCell>{getAutoResultBadge(run.autoResult)}</TableCell>
                    <TableCell>{run.performerName}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(run.createdAt)}
                    </TableCell>
                    {(debouncedFilters.approvalState === '' || debouncedFilters.approvalState === 'pending') && (
                      <TableCell>
                        {run.approvalState === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprovalAction(run, 'approve')}
                              disabled={approvalMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              aria-label="Duyệt"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprovalAction(run, 'reject')}
                              disabled={approvalMutation.isPending}
                              aria-label="Từ chối"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {(() => {
                const total = runsResult?.total ?? 0
                const start = total === 0 ? 0 : (page - 1) * pageSize + 1
                const end = Math.min(page * pageSize, total)
                return `Hiển thị ${start}-${end} trong ${total}`
              })()}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <Select
                  value={String(pageSize)}
                  onChange={(e) => {
                    const newSize = Number(e.target.value || 10)
                    setPageSize(newSize)
                    setPage(1)
                  }}
                >
                  <option value="10">10 hàng</option>
                  <option value="20">20 hàng</option>
                  <option value="50">50 hàng</option>
                  <option value="100">100 hàng</option>
                </Select>
              </div>
              {(() => {
                const total = runsResult?.total ?? 0
                const totalPages = Math.max(1, Math.ceil(total / pageSize))
                const canPrev = page > 1
                const canNext = page < totalPages

                // Build simple page list (max 7 buttons)
                const pages: number[] = []
                const maxButtons = 7
                let start = Math.max(1, page - 3)
                let end = Math.min(totalPages, start + maxButtons - 1)
                if (end - start + 1 < maxButtons) {
                  start = Math.max(1, end - maxButtons + 1)
                }
                for (let p = start; p <= end; p++) pages.push(p)

                return (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={!canPrev}>
                      «
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={!canPrev}>
                      Trước
                    </Button>
                    {pages.map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!canNext}>
                      Sau
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={!canNext}>
                      »
                    </Button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={!!selectedRun && !!action} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Duyệt lần chạy QC' : 'Từ chối lần chạy QC'}
            </DialogTitle>
            <DialogDescription>Vui lòng kiểm tra thông tin trước khi xác nhận.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRun && (
              <div className="space-y-2 text-sm text-gray-700">
                <div><strong>Thiết bị:</strong> {selectedRun.deviceCode} - {selectedRun.deviceName}</div>
                <div><strong>Xét nghiệm:</strong> {selectedRun.testCode} - {selectedRun.testName}</div>
                <div><strong>Mức:</strong> {selectedRun.level}</div>
                <div><strong>Giá trị:</strong> {selectedRun.value}</div>
                <div className="flex items-center gap-2"><strong>Kết quả tự động:</strong> {getAutoResultBadge(selectedRun.autoResult)}</div>
                <div><strong>Người thực hiện:</strong> {selectedRun.performerName}</div>
              </div>
            )}
            <div>
              <Label htmlFor="approval-note">
                {action === 'reject' ? 'Lý do từ chối *' : 'Ghi chú duyệt (không bắt buộc)'}
              </Label>
              <Textarea
                id="approval-note"
                placeholder={
                  action === 'reject' 
                    ? 'Vui lòng nhập lý do từ chối...' 
                    : 'Ghi chú tùy chọn cho lần duyệt này...'
                }
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="mt-1"
                required={action === 'reject'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRun(null)}
              disabled={approvalMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={submitApprovalAction}
              disabled={approvalMutation.isPending || (action === 'reject' && !approvalNote.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {approvalMutation.isPending ? 'Đang xử lý...' : 
                action === 'approve' ? 'Duyệt' : 'Từ chối'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Toolbar */}
      <BulkToolbar
        selectedCount={selectedRunIds.size}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        isLoading={isBulkLoading}
      />

      {/* Bulk Reject Modal */}
      <BulkRejectModal
        isOpen={isBulkRejectModalOpen}
        onClose={() => setIsBulkRejectModalOpen(false)}
        onConfirm={handleBulkRejectConfirm}
        selectedCount={selectedRunIds.size}
        isLoading={bulkRejectMutation.isPending}
      />
    </div>
  )
}
