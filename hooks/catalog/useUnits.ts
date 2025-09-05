import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Define types for units (since schema doesn't export Unit types directly)
export interface Unit {
  id: string
  code: string
  display: string
}

export interface NewUnit {
  code: string
  display: string
}

const BASE_URL = '/api/units'

export const unitKeys = {
  all: ['units'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...unitKeys.lists(), filters] as const,
  details: () => [...unitKeys.all, 'detail'] as const,
  detail: (id: string) => [...unitKeys.details(), id] as const,
}

// Fetch all units
export function useUnits() {
  return useQuery({
    queryKey: unitKeys.list({}),
    queryFn: async (): Promise<Unit[]> => {
      const response = await fetch(BASE_URL)
      if (!response.ok) {
        throw new Error('Failed to fetch units')
      }
      return response.json()
    },
  })
}

// Create unit
export function useCreateUnit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewUnit): Promise<Unit> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create unit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all })
    },
  })
}

// Update unit
export function useUpdateUnit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NewUnit }): Promise<Unit> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update unit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all })
    },
  })
}

// Delete unit (hard delete)
export function useDeleteUnit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete unit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all })
    },
  })
}