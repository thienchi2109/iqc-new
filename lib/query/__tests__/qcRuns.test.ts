import { QueryClient } from '@tanstack/react-query'
import { 
  updateQcRunsCache, 
  optimisticUpdateQcRunsCache, 
  rollbackQcRunsCache,
  invalidateRelatedQueries,
  getQcRunsQueryKey
} from '../qcRuns'

// Mock QcRun data
const mockRun = {
  id: '1',
  groupId: 'group-1',
  deviceId: 'device-1',
  testId: 'test-1',
  levelId: 'level-1',
  lotId: 'lot-1',
  value: 100,
  unit: 'mg/dL',
  method: 'Method A',
  performer: 'Tech User',
  z: 1.5,
  side: 'above' as const,
  status: 'accepted' as const,
  autoResult: 'accepted' as const,
  runAt: new Date(),
  createdAt: new Date(),
}

describe('qcRuns cache utilities', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('updateQcRunsCache', () => {
    it('should add new run to existing cache', () => {
      const queryKey = ['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1']
      const existingRuns = [{ ...mockRun, id: '2' }]
      
      queryClient.setQueryData(queryKey, existingRuns)
      updateQcRunsCache(queryClient, mockRun)
      
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual([mockRun, existingRuns[0]])
    })

    it('should create new cache entry when none exists', () => {
      updateQcRunsCache(queryClient, mockRun)
      
      const queryKey = ['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1']
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual([mockRun])
    })
  })

  describe('optimisticUpdateQcRunsCache', () => {
    it('should optimistically add run to cache', () => {
      const tempRun = { ...mockRun, id: 'temp-1' }
      optimisticUpdateQcRunsCache(queryClient, tempRun)
      
      const queryKey = ['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1']
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual([tempRun])
    })
  })

  describe('rollbackQcRunsCache', () => {
    it('should restore original runs data', () => {
      const queryKey = ['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1']
      const originalRuns = [{ ...mockRun, id: 'original-1' }]
      const tempRun = { ...mockRun, id: 'temp-1' }
      
      // Set original data
      queryClient.setQueryData(queryKey, originalRuns)
      
      // Optimistically add temp run
      optimisticUpdateQcRunsCache(queryClient, tempRun)
      
      // Verify temp run was added
      expect(queryClient.getQueryData(queryKey)).toEqual([tempRun, ...originalRuns])
      
      // Rollback to original
      rollbackQcRunsCache(queryClient, originalRuns, 'device-1', 'test-1', 'level-1', 'lot-1')
      
      // Verify original data was restored
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual(originalRuns)
    })
  })

  describe('getQcRunsQueryKey', () => {
    it('should generate correct query key', () => {
      const filters = {
        deviceId: 'device-1',
        testId: 'test-1',
        levelId: 'level-1',
        lotId: 'lot-1',
        limit: 25
      }
      
      const queryKey = getQcRunsQueryKey(filters)
      expect(queryKey).toEqual(['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1', 25])
    })

    it('should use default limit when not provided', () => {
      const filters = {
        deviceId: 'device-1',
        testId: 'test-1',
        levelId: 'level-1',
        lotId: 'lot-1'
      }
      
      const queryKey = getQcRunsQueryKey(filters)
      expect(queryKey).toEqual(['qc-runs', 'device-1', 'test-1', 'level-1', 'lot-1', 50])
    })
  })
})