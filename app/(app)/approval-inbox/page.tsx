'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckIcon, XIcon, ClockIcon, AlertTriangleIcon } from 'lucide-react'
import { toast } from 'sonner'

interface PendingRun {
  id: string
  value: number
  z: number
  autoResult: 'pass' | 'warn' | 'fail'
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
  })

  // Check if approval gate is enabled
  const useApprovalGate = process.env.NEXT_PUBLIC_USE_APPROVAL_GATE !== 'false'

  // Check user permissions
  const userRole = session?.user?.role
  const canApprove = ['supervisor', 'qaqc', 'admin'].includes(userRole || '')

  // Always call hooks in the same order
  // Fetch pending runs (always call, but conditionally enable)
  const { data: pendingRuns, isLoading, error } = useQuery({
    queryKey: ['pending-runs', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        approvalState: 'pending',
        limit: '100',
        ...(filters.deviceCode && { deviceCode: filters.deviceCode }),
        ...(filters.testCode && { testCode: filters.testCode }),
        ...(filters.level && { level: filters.level }),
        ...(filters.autoResult && { autoResult: filters.autoResult }),
      })
      
      const response = await fetch(`/api/qc/runs?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pending runs')
      }
      return response.json() as Promise<PendingRun[]>
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
        throw new Error(error.error || `Failed to ${action} run`)
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      toast.success(`QC run ${variables.action}d successfully`)
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

  // Guard clause for access control (after hooks)
  if (!canApprove || !useApprovalGate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {!useApprovalGate 
                ? 'Approval workflow is currently disabled.'
                : 'You do not have permission to access the approval inbox. Only supervisors, QA/QC staff, and administrators can approve QC runs.'
              }
            </CardDescription>
          </CardHeader>
        </Card>
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
      toast.error('Approval note is required when rejecting a run')
      return
    }
    
    approvalMutation.mutate({
      runId: selectedRun.id,
      action,
      approvalNote: approvalNote.trim() || undefined,
    })
  }

  const getAutoResultBadge = (autoResult: 'pass' | 'warn' | 'fail') => {
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
        {autoResult.toUpperCase()}
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 animate-spin" />
          <span>Loading pending approvals...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to load pending approvals. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">QC Approval Inbox</h1>
        <p className="text-gray-600">
          Review and approve/reject pending QC runs. Runs marked as &apos;fail&apos; require CAPA or subsequent passing runs before approval.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="device">Device</Label>
              <Input
                id="device"
                placeholder="Device code..."
                value={filters.deviceCode}
                onChange={(e) => setFilters(prev => ({ ...prev, deviceCode: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="test">Test</Label>
              <Input
                id="test"
                placeholder="Test code..."
                value={filters.testCode}
                onChange={(e) => setFilters(prev => ({ ...prev, testCode: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                placeholder="QC Level..."
                value={filters.level}
                onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="result">Auto Result</Label>
              <select
                id="result"
                className="w-full p-2 border rounded"
                value={filters.autoResult}
                onChange={(e) => setFilters(prev => ({ ...prev, autoResult: e.target.value }))}
              >
                <option value="">All Results</option>
                <option value="pass">Pass</option>
                <option value="warn">Warn</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending Approvals ({pendingRuns?.length || 0})</span>
            <Badge variant="outline" className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              Auto-refresh
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingRuns || pendingRuns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending approvals found</p>
              <p className="text-sm">All QC runs have been processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Z-Score</TableHead>
                  <TableHead>Auto Result</TableHead>
                  <TableHead>Performer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRuns.map((run) => (
                  <TableRow key={run.id}>
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
                    <TableCell className="font-mono">{run.z.toFixed(2)}</TableCell>
                    <TableCell>{getAutoResultBadge(run.autoResult)}</TableCell>
                    <TableCell>{run.performerName}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(run.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprovalAction(run, 'approve')}
                          disabled={approvalMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApprovalAction(run, 'reject')}
                          disabled={approvalMutation.isPending}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={!!selectedRun && !!action} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve QC Run' : 'Reject QC Run'}
            </DialogTitle>
            <DialogDescription>
              {selectedRun && (
                <div className="space-y-2">
                  <p><strong>Device:</strong> {selectedRun.deviceCode} - {selectedRun.deviceName}</p>
                  <p><strong>Test:</strong> {selectedRun.testCode} - {selectedRun.testName}</p>
                  <p><strong>Level:</strong> {selectedRun.level}</p>
                  <p><strong>Value:</strong> {selectedRun.value}</p>
                  <p><strong>Auto Result:</strong> {getAutoResultBadge(selectedRun.autoResult)}</p>
                  <p><strong>Performer:</strong> {selectedRun.performerName}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-note">
                {action === 'reject' ? 'Rejection Reason *' : 'Approval Note (Optional)'}
              </Label>
              <Textarea
                id="approval-note"
                placeholder={
                  action === 'reject' 
                    ? 'Please provide a reason for rejection...' 
                    : 'Optional note about this approval...'
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
              Cancel
            </Button>
            <Button
              onClick={submitApprovalAction}
              disabled={approvalMutation.isPending || (action === 'reject' && !approvalNote.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {approvalMutation.isPending ? 'Processing...' : 
                action === 'approve' ? 'Approve' : 'Reject'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
