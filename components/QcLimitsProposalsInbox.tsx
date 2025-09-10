/**
 * QC Limits Proposals Inbox Component
 * 
 * Features:
 * - List all pending proposals with details
 * - Bulk approval/skip actions
 * - Individual proposal management
 * - Status tracking and filtering
 * - Professional shadcn/ui design
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import SimpleSelect from '@/components/ui/SimpleSelect'
import { 
  CheckCircle, 
  X, 
  Clock, 
  TrendingUp, 
  Eye,
  Filter,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { 
  useProposals,
  useApproveProposal,
  useSkipProposal,
  useBulkProposalAction,
  type QcLimitProposal
} from '@/hooks/catalog/useQcLimitProposals'

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả (All)' },
  { value: 'pending', label: 'Chờ duyệt (Pending)' },
  { value: 'approved', label: 'Đã duyệt (Approved)' },
  { value: 'skipped', label: 'Đã bỏ qua (Skipped)' },
]

// Priority based on mean/SD values (simplified)
const getPriority = (proposal: QcLimitProposal): 'high' | 'medium' | 'low' => {
  const cv = parseFloat(proposal.cv)
  if (cv > 15) return 'high'
  if (cv > 10) return 'medium'
  return 'low'
}

// Format Vietnamese date
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function QcLimitsProposalsInbox() {
  // State management
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [showApprovalDialog, setShowApprovalDialog] = useState<QcLimitProposal | null>(null)
  const [showSkipDialog, setShowSkipDialog] = useState<QcLimitProposal | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [skipReason, setSkipReason] = useState('')

  // Hooks for data and actions
  const { data: proposalsResponse, isLoading, refetch } = useProposals({
    status: statusFilter === 'all' ? undefined : statusFilter as any
  })
  const proposals = proposalsResponse?.data || []
  const approveProposal = useApproveProposal()
  const skipProposal = useSkipProposal()
  const bulkAction = useBulkProposalAction()

  // Filtered proposals based on search
  const filteredProposals = proposals.filter((proposal: QcLimitProposal) => 
    searchTerm === '' || 
    proposal.testCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.deviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.lotCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Selection handlers
  const toggleProposalSelection = (proposalId: string) => {
    const newSelection = new Set(selectedProposals)
    if (newSelection.has(proposalId)) {
      newSelection.delete(proposalId)
    } else {
      newSelection.add(proposalId)
    }
    setSelectedProposals(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedProposals.size === filteredProposals.length) {
      setSelectedProposals(new Set())
    } else {
      setSelectedProposals(new Set(filteredProposals.map((p: QcLimitProposal) => p.id)))
    }
  }

  // Action handlers
  const handleApproval = async (proposal: QcLimitProposal) => {
    try {
      await approveProposal.mutateAsync(proposal.id)
      setShowApprovalDialog(null)
      setApprovalNotes('')
    } catch (error) {
      console.error('Failed to approve proposal:', error)
    }
  }

  const handleSkip = async (proposal: QcLimitProposal) => {
    try {
      await skipProposal.mutateAsync({
        id: proposal.id,
        reason: skipReason
      })
      setShowSkipDialog(null)
      setSkipReason('')
    } catch (error) {
      console.error('Failed to skip proposal:', error)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'skip') => {
    if (selectedProposals.size === 0) return
    
    try {
      await bulkAction.mutateAsync({
        action,
        proposalIds: Array.from(selectedProposals),
        reason: action === 'skip' ? skipReason : undefined
      })
      setSelectedProposals(new Set())
      setApprovalNotes('')
      setSkipReason('')
    } catch (error) {
      console.error(`Failed to ${action} proposals:`, error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QC Limits Proposals</h1>
          <p className="text-gray-600 mt-1">
            Review and approve Rolling-N QC limits proposals
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by test, device, or lot code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:w-48">
              <Label className="text-sm font-medium">Status</Label>
              <SimpleSelect
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProposals.size > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedProposals.size} selected
                </Badge>
                <span className="text-sm text-gray-600">
                  Bulk actions available
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkAction.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleBulkAction('skip')}
                  disabled={bulkAction.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Skip All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedProposals(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading proposals...</p>
            </CardContent>
          </Card>
        ) : filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No proposals found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 px-2">
              <input
                type="checkbox"
                checked={selectedProposals.size === filteredProposals.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
              <Label className="text-sm">
                Select all ({filteredProposals.length})
              </Label>
            </div>

            {/* Proposals */}
            {filteredProposals.map((proposal: QcLimitProposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                isSelected={selectedProposals.has(proposal.id)}
                onToggleSelection={() => toggleProposalSelection(proposal.id)}
                onApprove={() => setShowApprovalDialog(proposal)}
                onSkip={() => setShowSkipDialog(proposal)}
              />
            ))}
          </>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog !== null} onOpenChange={(open) => !open && setShowApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Proposal</DialogTitle>
          </DialogHeader>
          {showApprovalDialog && (
            <div className="space-y-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">
                  {showApprovalDialog.testCode} {showApprovalDialog.level} - {showApprovalDialog.deviceCode}
                </h4>
                <div className="text-sm text-green-700">
                  Lot: {showApprovalDialog.lotCode} | N={showApprovalDialog.rollingN}
                </div>
              </div>
              
              <div>
                <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes about this approval..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowApprovalDialog(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleApproval(showApprovalDialog)}
                  disabled={approveProposal.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approveProposal.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={showSkipDialog !== null} onOpenChange={(open) => !open && setShowSkipDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Proposal</DialogTitle>
          </DialogHeader>
          {showSkipDialog && (
            <div className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">
                  {showSkipDialog.testCode} {showSkipDialog.level} - {showSkipDialog.deviceCode}
                </h4>
                <div className="text-sm text-red-700">
                  Lot: {showSkipDialog.lotCode} | N={showSkipDialog.rollingN}
                </div>
              </div>
              
              <div>
                <Label htmlFor="skip-reason">Skip Reason (Required)</Label>
                <Textarea
                  id="skip-reason"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Explain why this proposal is being skipped..."
                  className="mt-1"
                  required
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSkipDialog(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleSkip(showSkipDialog)}
                  disabled={skipProposal.isPending || !skipReason.trim()}
                  variant="destructive"
                >
                  {skipProposal.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Skipping...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Skip
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Individual Proposal Card Component
interface ProposalCardProps {
  proposal: QcLimitProposal
  isSelected: boolean
  onToggleSelection: () => void
  onApprove: () => void
  onSkip: () => void
}

function ProposalCard({ 
  proposal, 
  isSelected, 
  onToggleSelection, 
  onApprove, 
  onSkip 
}: ProposalCardProps) {
  const priority = getPriority(proposal)
  
  const priorityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200', 
    low: 'bg-gray-50 border-gray-200'
  }

  return (
    <Card className={`${priorityColors[priority]} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="mt-1 rounded border-gray-300"
          />
          
          {/* Main Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  {proposal.testCode} {proposal.level}
                </h3>
                <Badge variant={
                  proposal.status === 'pending' ? 'default' :
                  proposal.status === 'approved' ? 'secondary' : 'destructive'
                }>
                  {proposal.status === 'pending' && 'Pending'}
                  {proposal.status === 'approved' && 'Approved'}
                  {proposal.status === 'skipped' && 'Skipped'}
                </Badge>
                <Badge variant="outline" className={
                  priority === 'high' ? 'border-red-300 text-red-700' :
                  priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                  'border-gray-300 text-gray-700'
                }>
                  {priority === 'high' && 'High Priority'}
                  {priority === 'medium' && 'Medium Priority'}
                  {priority === 'low' && 'Low Priority'}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(proposal.createdAt)}
              </div>
            </div>

            {/* Group Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Device:</span>
                <div className="font-mono">{proposal.deviceCode}</div>
              </div>
              <div>
                <span className="text-gray-600">Lot:</span>
                <div className="font-mono">{proposal.lotCode}</div>
              </div>
              <div>
                <span className="text-gray-600">Window:</span>
                <div className="font-mono">N={proposal.rollingN}</div>
              </div>
              <div>
                <span className="text-gray-600">Creator:</span>
                <div>{proposal.createdByName || 'System'}</div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white/70 p-3 rounded border">
              <h4 className="font-medium text-sm mb-2">Proposed Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Mean</div>
                  <div className="font-mono">{parseFloat(proposal.mean).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">SD</div>
                  <div className="font-mono">{parseFloat(proposal.sd).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">CV%</div>
                  <div className="font-mono">{parseFloat(proposal.cv).toFixed(2)}%</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Based on {proposal.rollingN} runs from {formatDate(proposal.windowFrom)} to {formatDate(proposal.windowTo)}
                {proposal.excludedCount > 0 && ` (${proposal.excludedCount} excluded)`}
              </div>
            </div>

            {/* Notes */}
            {proposal.notes && (
              <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {proposal.notes}
                </div>
              </div>
            )}

            {/* Reasons */}
            {proposal.reasons && proposal.reasons.length > 0 && (
              <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                <div className="text-sm">
                  <span className="font-medium">Eligibility:</span>
                  <ul className="mt-1 space-y-1">
                    {proposal.reasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-green-600">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            {proposal.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={onSkip}>
                  <X className="h-4 w-4 mr-1" />
                  Skip
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
