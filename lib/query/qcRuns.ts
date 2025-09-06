import { QueryClient } from '@tanstack/react-query'

type QcRunForCache = {
  id: string
  value: number
  runAt: string
  deviceId?: string
  testId?: string
  levelId?: string
  lotId?: string
  [key: string]: any
}

/**
 * Update QC runs cache after successful save
 * @param queryClient - TanStack Query client instance
 * @param newRun - The newly created QC run
 */
export function updateQcRunsCache(queryClient: QueryClient, newRun: QcRunForCache) {
  // Update the main QC runs query for the chart if we have the required IDs
  if (newRun.deviceId && newRun.testId && newRun.levelId && newRun.lotId) {
    const runsQueryKey = ['qc-runs', newRun.deviceId, newRun.testId, newRun.levelId, newRun.lotId]
    
    queryClient.setQueryData<QcRunForCache[]>(runsQueryKey, (oldData) => {
      if (!oldData) return [newRun]
      // Add the new run to the beginning of the array (most recent first)
      return [newRun, ...oldData]
    })
  }

  // Update recent runs query if it exists
  queryClient.setQueryData<QcRunForCache[]>(['recent-runs'], (oldData) => {
    if (!oldData) return [newRun]
    // Add to recent runs (limit to 10 most recent)
    return [newRun, ...oldData].slice(0, 10)
  })

  // Update run stats query if it exists
  queryClient.invalidateQueries({ queryKey: ['run-stats'] })
}

/**
 * Optimistically update QC runs cache before save
 * @param queryClient - TanStack Query client instance
 * @param tempRun - Temporary run data for optimistic update
 */
export function optimisticUpdateQcRunsCache(queryClient: QueryClient, tempRun: QcRunForCache) {
  const runsQueryKey = ['qc-runs', tempRun.deviceId, tempRun.testId, tempRun.levelId, tempRun.lotId]
  
  // Optimistically add the run to cache
  queryClient.setQueryData<QcRunForCache[]>(runsQueryKey, (oldData) => {
    if (!oldData) return [tempRun]
    return [tempRun, ...oldData]
  })
}

/**
 * Rollback optimistic update on error
 * @param queryClient - TanStack Query client instance
 * @param originalRuns - Original runs data to restore
 * @param deviceId - Device ID for query key
 * @param testId - Test ID for query key
 * @param levelId - Level ID for query key
 * @param lotId - Lot ID for query key
 */
export function rollbackQcRunsCache(
  queryClient: QueryClient,
  originalRuns: QcRunForCache[] | undefined,
  deviceId: string,
  testId: string,
  levelId: string,
  lotId: string
) {
  const runsQueryKey = ['qc-runs', deviceId, testId, levelId, lotId]
  queryClient.setQueryData<QcRunForCache[]>(runsQueryKey, originalRuns || [])
}

/**
 * Clear ghost points cache after successful save
 * @param queryClient - TanStack Query client instance
 * @param levelId - QC level ID to clear ghost points for
 */
export function clearGhostPointsCache(queryClient: QueryClient, levelId: string) {
  // Invalidate ghost points queries
  queryClient.invalidateQueries({ queryKey: ['ghost-points', levelId] })
}

/**
 * Invalidate related queries after QC run operations
 * @param queryClient - TanStack Query client instance
 */
export function invalidateRelatedQueries(queryClient: QueryClient) {
  // Invalidate queries that might be affected by new QC runs
  queryClient.invalidateQueries({ queryKey: ['recent-runs'] })
  queryClient.invalidateQueries({ queryKey: ['run-stats'] })
  queryClient.invalidateQueries({ queryKey: ['qc-limits'] })
}

/**
 * Get query key for QC runs based on filters
 * @param filters - Filter parameters for QC runs
 */
export function getQcRunsQueryKey(filters: {
  deviceId?: string
  testId?: string
  levelId?: string
  lotId?: string
  limit?: number
}) {
  return [
    'qc-runs',
    filters.deviceId,
    filters.testId,
    filters.levelId,
    filters.lotId,
    filters.limit || 50
  ]
}

/**
 * Get query key for recent QC runs
 */
export function getRecentRunsQueryKey() {
  return ['recent-runs']
}

/**
 * Get query key for run statistics
 */
export function getRunStatsQueryKey() {
  return ['run-stats']
}

/**
 * Update run group cache after creating a new run group
 * @param queryClient - TanStack Query client instance
 * @param runGroup - The newly created run group
 */
export function updateRunGroupCache(queryClient: QueryClient, runGroup: any) {
  // Update run groups query if it exists
  queryClient.setQueryData<any[]>(['run-groups'], (oldData) => {
    if (!oldData) return [runGroup]
    return [runGroup, ...oldData]
  })
}

/**
 * Invalidate run group related queries
 * @param queryClient - TanStack Query client instance
 */
export function invalidateRunGroupQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['run-groups'] })
}

/**
 * Advanced cache management utilities
 */

/**
 * Prefetch QC runs data for improved performance
 * @param queryClient - TanStack Query client instance
 * @param deviceId - Device ID
 * @param testId - Test ID
 * @param levelId - Level ID
 * @param lotId - Lot ID
 */
export function prefetchQcRuns(
  queryClient: QueryClient,
  deviceId: string,
  testId: string,
  levelId: string,
  lotId: string
) {
  const queryKey = ['qc-runs', deviceId, testId, levelId, lotId]
  
  queryClient.prefetchQuery({
    queryKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Smart cache invalidation - only invalidate stale data
 * @param queryClient - TanStack Query client instance
 * @param filters - Optional filters for targeted invalidation
 */
export function smartInvalidateQueries(
  queryClient: QueryClient,
  filters?: {
    deviceId?: string
    testId?: string
    levelId?: string
  }
) {
  // If filters provided, invalidate specific queries
  if (filters) {
    if (filters.deviceId) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'qc-runs' && key[1] === filters.deviceId
        }
      })
    }
    if (filters.testId) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'qc-runs' && key[2] === filters.testId
        }
      })
    }
    if (filters.levelId) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'qc-runs' && key[3] === filters.levelId
        }
      })
    }
  } else {
    // Fallback to broad invalidation
    invalidateRelatedQueries(queryClient)
  }
}

/**
 * Background sync for QC runs - periodically refresh data
 * @param queryClient - TanStack Query client instance
 * @param deviceId - Device ID
 * @param testId - Test ID
 * @param levelId - Level ID
 * @param lotId - Lot ID
 */
export function enableBackgroundSync(
  queryClient: QueryClient,
  deviceId: string,
  testId: string,
  levelId: string,
  lotId: string
) {
  const queryKey = ['qc-runs', deviceId, testId, levelId, lotId]
  
  // Enable background refetching
  queryClient.setQueryDefaults(queryKey, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchIntervalInBackground: true,
  })
}

export type QcRunsCacheUtils = {
  updateQcRunsCache: typeof updateQcRunsCache
  optimisticUpdateQcRunsCache: typeof optimisticUpdateQcRunsCache
  rollbackQcRunsCache: typeof rollbackQcRunsCache
  clearGhostPointsCache: typeof clearGhostPointsCache
  invalidateRelatedQueries: typeof invalidateRelatedQueries
  getQcRunsQueryKey: typeof getQcRunsQueryKey
  getRecentRunsQueryKey: typeof getRecentRunsQueryKey
  getRunStatsQueryKey: typeof getRunStatsQueryKey
  updateRunGroupCache: typeof updateRunGroupCache
  invalidateRunGroupQueries: typeof invalidateRunGroupQueries
}