import { QueryClient } from '@tanstack/react-query'
import { QcRun } from '@/components/lj/LjPanel'

/**
 * Query cache utilities for QC runs
 * Provides optimistic updates and cache management for QC run operations
 */

/**
 * Update QC runs cache after successful save
 * @param queryClient - TanStack Query client instance
 * @param newRun - The newly created QC run
 */
export function updateQcRunsCache(queryClient: QueryClient, newRun: QcRun) {
  // Update the main QC runs query for the chart
  const runsQueryKey = ['qc-runs', newRun.deviceId, newRun.testId, newRun.levelId, newRun.lotId]
  
  queryClient.setQueryData<QcRun[]>(runsQueryKey, (oldData) => {
    if (!oldData) return [newRun]
    // Add the new run to the beginning of the array (most recent first)
    return [newRun, ...oldData]
  })

  // Update recent runs query if it exists
  queryClient.setQueryData<QcRun[]>(['recent-runs'], (oldData) => {
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
export function optimisticUpdateQcRunsCache(queryClient: QueryClient, tempRun: QcRun) {
  const runsQueryKey = ['qc-runs', tempRun.deviceId, tempRun.testId, tempRun.levelId, tempRun.lotId]
  
  // Optimistically add the run to cache
  queryClient.setQueryData<QcRun[]>(runsQueryKey, (oldData) => {
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
  originalRuns: QcRun[] | undefined,
  deviceId: string,
  testId: string,
  levelId: string,
  lotId: string
) {
  const runsQueryKey = ['qc-runs', deviceId, testId, levelId, lotId]
  queryClient.setQueryData<QcRun[]>(runsQueryKey, originalRuns || [])
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