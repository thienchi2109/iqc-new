import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Define types for methods (since schema doesn't export Method types directly)
export interface Method {
  id: string
  code: string
  name: string
}

export interface NewMethod {
  code: string
  name: string
}

const BASE_URL = '/api/methods'

export const methodKeys = {
  all: ['methods'] as const,
  lists: () => [...methodKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...methodKeys.lists(), filters] as const,
  details: () => [...methodKeys.all, 'detail'] as const,
  detail: (id: string) => [...methodKeys.details(), id] as const,
}

// Fetch all methods
export function useMethods() {
  return useQuery({
    queryKey: methodKeys.list({}),
    queryFn: async (): Promise<Method[]> => {
      const response = await fetch(BASE_URL)
      if (!response.ok) {
        throw new Error('Failed to fetch methods')
      }
      return response.json()
    },
  })
}

// Create method
export function useCreateMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewMethod): Promise<Method> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create method')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: methodKeys.all })
    },
  })
}

// Update method
export function useUpdateMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NewMethod }): Promise<Method> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update method')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: methodKeys.all })
    },
  })
}

// Delete method (hard delete)
export function useDeleteMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete method')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: methodKeys.all })
    },
  })
}