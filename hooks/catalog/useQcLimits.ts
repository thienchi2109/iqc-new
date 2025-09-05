import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QcLimit, NewQcLimit } from '@/lib/db/schema'

const BASE_URL = '/api/qc/limits'

export const qcLimitKeys = {
  all: ['qc-limits'] as const,
  lists: () => [...qcLimitKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...qcLimitKeys.lists(), filters] as const,
  details: () => [...qcLimitKeys.all, 'detail'] as const,
  detail: (id: string) => [...qcLimitKeys.details(), id] as const,
}

// Fetch QC limits
export function useQcLimits(filters: { 
  testId?: string
  levelId?: string
  lotId?: string
  deviceId?: string
} = {}) {
  return useQuery({
    queryKey: qcLimitKeys.list(filters),
    queryFn: async (): Promise<QcLimit[]> => {
      const searchParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          searchParams.set(key, value)
        }
      })
      
      const response = await fetch(`${BASE_URL}?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch QC limits')
      }
      return response.json()
    },
  })
}

// Create or update QC limit (the API handles both)
export function useCreateQcLimit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Omit<NewQcLimit, 'cv'>): Promise<QcLimit> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create QC limit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLimitKeys.all })
    },
  })
}

// Update specific QC limit
export function useUpdateQcLimit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<NewQcLimit, 'testId' | 'levelId' | 'lotId' | 'deviceId' | 'cv'> }): Promise<QcLimit> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update QC limit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLimitKeys.all })
    },
  })
}

// Delete QC limit (hard delete)
export function useDeleteQcLimit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete QC limit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLimitKeys.all })
    },
  })
}