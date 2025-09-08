import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QcLevel, NewQcLevel } from '@/lib/db/schema'

const BASE_URL = '/api/qc/levels'

export const qcLevelKeys = {
  all: ['qc-levels'] as const,
  lists: () => [...qcLevelKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...qcLevelKeys.lists(), filters] as const,
  details: () => [...qcLevelKeys.all, 'detail'] as const,
  detail: (id: string) => [...qcLevelKeys.details(), id] as const,
}

// Fetch QC levels
export function useQcLevels(filters: { testId?: string; isActive?: boolean } = {}) {
  const hasFilter = filters.testId !== undefined || filters.isActive !== undefined
  return useQuery({
    queryKey: qcLevelKeys.list(filters),
    queryFn: async (): Promise<QcLevel[]> => {
      const searchParams = new URLSearchParams()
      if (filters.testId) {
        searchParams.set('testId', filters.testId)
      }
      if (filters.isActive !== undefined) {
        searchParams.set('isActive', filters.isActive.toString())
      }
      
      const response = await fetch(`${BASE_URL}?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch QC levels')
      }
      return response.json()
    },
    enabled: hasFilter || Object.keys(filters).length === 0, // Fetch when filters set or no filters at all
  })
}

// Create QC level
export function useCreateQcLevel() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewQcLevel): Promise<QcLevel> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        // try to read JSON body for structured error information
        let errorBody: any = null
        try {
          errorBody = await response.json()
        } catch (e) {
          // ignore JSON parse errors
        }

        const message = errorBody?.message || 'Failed to create QC level'
        const err = new Error(message)
        // attach body for callers that want programmatic access
        ;(err as any).body = errorBody
        throw err
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLevelKeys.all })
    },
  })
}

// Update QC level
export function useUpdateQcLevel() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewQcLevel> }): Promise<QcLevel> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        let errorBody: any = null
        try {
          errorBody = await response.json()
        } catch (e) {}

        const message = errorBody?.message || 'Failed to update QC level'
        const err = new Error(message)
        ;(err as any).body = errorBody
        throw err
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLevelKeys.all })
    },
  })
}

// Delete QC level (soft delete)
export function useDeleteQcLevel() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        let errorBody: any = null
        try {
          errorBody = await response.json()
        } catch (e) {}

        const message = errorBody?.message || 'Failed to delete QC level'
        const err = new Error(message)
        ;(err as any).body = errorBody
        throw err
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLevelKeys.all })
    },
  })
}
