/**
 * React Query hooks for Rolling-N QC Limits Proposals
 * 
 * Provides hooks for:
 * - Computing rolling proposals
 * - Managing proposal lifecycle (create, list, approve, skip)
 * - Bulk operations for proposals
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

// Types
export interface RollingProposalParams {
  testCode: string
  level: 'L1' | 'L2' | 'L3'
  lotCode: string
  deviceCode: string
  n?: number
}

export interface RollingProposalResult {
  eligible: boolean
  reasons: string[]
  group: {
    testCode: string
    level: string
    lotCode: string
    deviceCode: string
  }
  window?: {
    n: number
    from: Date
    to: Date
    span_days: number
  }
  stats?: {
    mean: number
    sd: number
    cv: number
  }
  excludedCount: number
  currentLimits?: {
    mean: number
    sd: number
    cv: number
    source: string
  }
}

export interface QcLimitProposal {
  id: string
  testCode: string
  testName: string
  level: 'L1' | 'L2' | 'L3'
  lotCode: string
  deviceCode: string
  deviceName: string
  rollingN: number
  windowFrom: Date
  windowTo: Date
  mean: string
  sd: string
  cv: string
  excludedCount: number
  reasons: string[]
  notes?: string
  status: 'pending' | 'approved' | 'skipped'
  createdAt: Date
  createdByName: string
  approvedByName?: string
  approvedAt?: Date
}

export interface ProposalListFilters {
  status?: 'pending' | 'approved' | 'skipped'
  testCode?: string
  deviceCode?: string
  page?: number
  limit?: number
}

// API functions
async function computeRollingProposal(params: RollingProposalParams): Promise<RollingProposalResult> {
  const query = new URLSearchParams({
    testCode: params.testCode,
    level: params.level,
    lotCode: params.lotCode,
    deviceCode: params.deviceCode,
    ...(params.n && { n: params.n.toString() }),
  })

  const response = await fetch(`/api/qc/limits/proposal?${query}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to compute rolling proposal')
  }

  const { data } = await response.json()
  return data
}

async function createProposal(params: RollingProposalParams & { notes?: string }) {
  const response = await fetch('/api/qc/limits/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create proposal')
  }

  return response.json()
}

async function listProposals(filters: ProposalListFilters = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, value.toString())
    }
  })

  const response = await fetch(`/api/qc/limits/proposals?${query}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list proposals')
  }

  return response.json()
}

async function approveProposal(id: string) {
  const response = await fetch(`/api/qc/limits/proposals/${id}/approve`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to approve proposal')
  }

  return response.json()
}

async function skipProposal(id: string, reason: string) {
  const response = await fetch(`/api/qc/limits/proposals/${id}/skip`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to skip proposal')
  }

  return response.json()
}

async function bulkAction(action: 'approve' | 'skip', proposalIds: string[], reason?: string) {
  const response = await fetch('/api/qc/limits/proposals/bulk-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, proposalIds, reason }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to perform bulk action')
  }

  return response.json()
}

// Hooks
export function useComputeRollingProposal() {
  return useMutation({
    mutationFn: computeRollingProposal,
    retry: false,
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      // Invalidate proposals list
      queryClient.invalidateQueries({ queryKey: ['qc-limit-proposals'] })
    },
  })
}

export function useProposals(filters: ProposalListFilters = {}) {
  return useQuery({
    queryKey: ['qc-limit-proposals', filters],
    queryFn: () => listProposals(filters),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useApproveProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: approveProposal,
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['qc-limit-proposals'] })
      queryClient.invalidateQueries({ queryKey: ['qc-limits'] })
    },
  })
}

export function useSkipProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      skipProposal(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-limit-proposals'] })
    },
  })
}

export function useBulkProposalAction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ action, proposalIds, reason }: { 
      action: 'approve' | 'skip'
      proposalIds: string[]
      reason?: string 
    }) => bulkAction(action, proposalIds, reason),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['qc-limit-proposals'] })
      if (variables.action === 'approve') {
        queryClient.invalidateQueries({ queryKey: ['qc-limits'] })
      }
    },
  })
}

// Query key helpers
export const proposalQueryKeys = {
  all: ['qc-limit-proposals'] as const,
  lists: () => [...proposalQueryKeys.all, 'list'] as const,
  list: (filters: ProposalListFilters) => [...proposalQueryKeys.lists(), filters] as const,
}
