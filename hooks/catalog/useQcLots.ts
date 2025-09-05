import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QcLot, NewQcLot } from '@/lib/db/schema'

const BASE_URL = '/api/qc/lots'

export const qcLotKeys = {
  all: ['qc-lots'] as const,
  lists: () => [...qcLotKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...qcLotKeys.lists(), filters] as const,
  details: () => [...qcLotKeys.all, 'detail'] as const,
  detail: (id: string) => [...qcLotKeys.details(), id] as const,
}

// Fetch QC lots
export function useQcLots(filters: { levelId?: string; levelIds?: string[] } = {}) {
  return useQuery({
    queryKey: qcLotKeys.list(filters),
    queryFn: async (): Promise<QcLot[]> => {
      const searchParams = new URLSearchParams()
      
      if (filters.levelId) {
        searchParams.set('levelId', filters.levelId)
      } else if (filters.levelIds && filters.levelIds.length > 0) {
        filters.levelIds.forEach(id => searchParams.append('levelId', id))
      }
      
      const response = await fetch(`${BASE_URL}?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch QC lots')
      }
      return response.json()
    },
    enabled: !!filters.levelId || (filters.levelIds && filters.levelIds.length > 0) || Object.keys(filters).length === 0,
  })
}

// Create QC lot
export function useCreateQcLot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewQcLot): Promise<QcLot> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create QC lot')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLotKeys.all })
    },
  })
}

// Update QC lot
export function useUpdateQcLot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewQcLot> }): Promise<QcLot> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update QC lot')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLotKeys.all })
    },
  })
}

// Delete QC lot (hard delete)
export function useDeleteQcLot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete QC lot')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcLotKeys.all })
    },
  })
}