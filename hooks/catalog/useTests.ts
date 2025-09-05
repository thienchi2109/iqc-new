import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Test, NewTest } from '@/lib/db/schema'

const BASE_URL = '/api/tests'

export const testKeys = {
  all: ['tests'] as const,
  lists: () => [...testKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...testKeys.lists(), filters] as const,
  details: () => [...testKeys.all, 'detail'] as const,
  detail: (id: string) => [...testKeys.details(), id] as const,
}

// Fetch all tests
export function useTests(filters: { isActive?: boolean } = {}) {
  return useQuery({
    queryKey: testKeys.list(filters),
    queryFn: async (): Promise<Test[]> => {
      const searchParams = new URLSearchParams()
      if (filters.isActive !== undefined) {
        searchParams.set('isActive', filters.isActive.toString())
      }
      
      const response = await fetch(`${BASE_URL}?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tests')
      }
      return response.json()
    },
  })
}

// Create test
export function useCreateTest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: NewTest): Promise<Test> => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create test')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch test queries
      queryClient.invalidateQueries({ queryKey: testKeys.all })
    },
  })
}

// Update test
export function useUpdateTest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewTest> }): Promise<Test> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update test')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all })
    },
  })
}

// Delete test (soft delete)
export function useDeleteTest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${BASE_URL}?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete test')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all })
    },
  })
}