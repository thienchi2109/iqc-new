import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Device, NewDevice } from '@/lib/db/schema'

const BASE_URL = '/api/devices'

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
}

// Fetch all devices
export function useDevices(filters: { isActive?: boolean } = {}) {
  return useQuery({
    queryKey: deviceKeys.list(filters),
    queryFn: async (): Promise<Device[]> => {
      const searchParams = new URLSearchParams()
      if (filters.isActive !== undefined) {
        searchParams.set('isActive', filters.isActive.toString())
      }
      
      const response = await fetch(`${BASE_URL}?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch devices')
      }
      return response.json()
    },
  })
}

// Create device
export function useCreateDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewDevice): Promise<Device> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create device')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}

// Update device
export function useUpdateDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewDevice> }): Promise<Device> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update device')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}

// Delete device (soft delete)
export function useDeleteDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete device')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}