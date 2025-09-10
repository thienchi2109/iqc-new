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

// Import existing QC runs approval page content (will need to refactor)
// For now, let's create a placeholder component

function QcRunsInbox() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8 text-gray-500">
        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">QC Runs Approval</h3>
        <p className="text-sm">
          This section will contain the existing QC runs approval workflow.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          To be integrated from the existing approval-inbox page.
        </p>
      </div>
    </div>
  )
}

// Get counts for tab badges
function useApprovalCounts() {
  const { data: session } = useSession()
  
  // QC Runs count (placeholder)
  const qcRunsCount = useQuery({
    queryKey: ['pending-qc-runs-count'],
    queryFn: async () => {
      // This would call the existing API endpoint
      return { pending: 0 }
    },
    enabled: !!session,
    staleTime: 30 * 1000,
  })

  // QC Limits Proposals count
  const proposalsCount = useQuery({
    queryKey: ['pending-proposals-count'],
    queryFn: async () => {
      const response = await fetch('/api/qc/limits/proposals?status=pending&limit=1')
      if (!response.ok) return { pending: 0 }
      const data = await response.json()
      return { pending: data.total || 0 }
    },
    enabled: !!session,
    staleTime: 30 * 1000,
  })

  return {
    qcRuns: qcRunsCount.data?.pending || 0,
    proposals: proposalsCount.data?.pending || 0,
    isLoading: qcRunsCount.isLoading || proposalsCount.isLoading
  }
}

export default function EnhancedApprovalInboxPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('qc-runs')
  const counts = useApprovalCounts()

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to access the approval inbox.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalPending = counts.qcRuns + counts.proposals

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            Approval Inbox
          </h1>
          <p className="text-gray-600 mt-1">
            Review and approve QC data and system proposals
          </p>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-orange-600">
                {totalPending}
              </div>
              <div className="text-sm text-gray-600">
                Total Pending
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Warning for pending items */}
      {totalPending > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="font-medium text-orange-800">
                  You have {totalPending} pending approval{totalPending !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-orange-700">
                  {counts.qcRuns > 0 && `${counts.qcRuns} QC run${counts.qcRuns !== 1 ? 's' : ''}`}
                  {counts.qcRuns > 0 && counts.proposals > 0 && ', '}
                  {counts.proposals > 0 && `${counts.proposals} QC limits proposal${counts.proposals !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qc-runs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            QC Runs
            {counts.qcRuns > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {counts.qcRuns}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="qc-limits" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            QC Limits Proposals
            {counts.proposals > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {counts.proposals}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qc-runs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                QC Runs Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QcRunsInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qc-limits" className="mt-6">
          <QcLimitsProposalsInbox />
        </TabsContent>
      </Tabs>
    </div>
  )
}
