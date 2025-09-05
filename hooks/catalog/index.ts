// Basic entities
export * from './useTests'
export * from './useDevices'
export * from './useUnits'
export * from './useMethods'

// QC entities
export * from './useQcLevels'
export * from './useQcLots'
export * from './useQcLimits'

// Re-export query keys for external cache management
export { testKeys } from './useTests'
export { deviceKeys } from './useDevices'
export { unitKeys } from './useUnits'
export { methodKeys } from './useMethods'
export { qcLevelKeys } from './useQcLevels'
export { qcLotKeys } from './useQcLots'
export { qcLimitKeys } from './useQcLimits'

// Utility type for all catalog entities
export type CatalogEntity = 'tests' | 'devices' | 'units' | 'methods' | 'qc-levels' | 'qc-lots' | 'qc-limits'

// Helper function to invalidate all catalog queries
export function invalidateAllCatalogQueries(queryClient: any) {
  const allKeys = [
    'tests',
    'devices', 
    'units',
    'methods',
    'qc-levels',
    'qc-lots',
    'qc-limits'
  ]
  
  allKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] })
  })
}