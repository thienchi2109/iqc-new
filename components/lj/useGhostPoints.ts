import { useState, useCallback } from 'react'

export interface GhostPoint {
  levelId: string
  value: number
  z: number
  time: Date
  color: string // Color based on z-score thresholds
  side: 'above' | 'below' | 'on'
}

export interface GhostPointsState {
  [levelId: string]: GhostPoint
}

/**
 * Hook for managing ghost points in Levey-Jennings chart
 * Provides client-side ghost point visualization as users type QC values
 */
export function useGhostPoints() {
  const [ghostPoints, setGhostPoints] = useState<GhostPointsState>({})

  /**
   * Compute Z-score with proper error handling
   * @param value - The QC value
   * @param mean - Statistical mean from QC limits
   * @param sd - Standard deviation from QC limits
   * @returns Z-score or null if invalid inputs
   */
  const computeZ = useCallback((value: number, mean: number, sd: number): number | null => {
    if (!sd || sd <= 0 || isNaN(value) || isNaN(mean)) return null
    return (value - mean) / sd
  }, [])

  /**
   * Determine color based on z-score thresholds for Westgard rules
   * @param z - The z-score
   * @returns Color string for ghost point visualization
   */
  const getColorForZ = useCallback((z: number): string => {
    const absZ = Math.abs(z)
    if (absZ > 3) return '#dc2626' // red-600 - 1-3s fail
    if (absZ > 2) return '#ea580c' // orange-600 - 1-2s warn
    if (absZ > 1) return '#d97706' // amber-600 - caution
    return '#16a34a' // green-600 - acceptable
  }, [])

  /**
   * Determine which side of mean the value falls on
   * @param z - The z-score
   * @returns Side classification
   */
  const getSideForZ = useCallback((z: number): 'above' | 'below' | 'on' => {
    if (z > 0.1) return 'above'
    if (z < -0.1) return 'below'
    return 'on'
  }, [])

  /**
   * Add or update a ghost point for a specific level
   * @param levelId - QC level ID
   * @param value - QC value entered by user
   * @param mean - Statistical mean
   * @param sd - Standard deviation
   * @param time - Optional timestamp (defaults to now)
   */
  const addGhost = useCallback((
    levelId: string,
    value: number,
    mean: number,
    sd: number,
    time: Date = new Date()
  ) => {
    const z = computeZ(value, mean, sd)
    if (z === null) {
      // If invalid z-score, remove the ghost point
      clearGhost(levelId)
      return
    }

    const ghostPoint: GhostPoint = {
      levelId,
      value,
      z,
      time,
      color: getColorForZ(z),
      side: getSideForZ(z),
    }

    setGhostPoints(prev => ({
      ...prev,
      [levelId]: ghostPoint,
    }))
  }, [computeZ, getColorForZ, getSideForZ])

  /**
   * Clear ghost point for a specific level
   * @param levelId - QC level ID
   */
  const clearGhost = useCallback((levelId: string) => {
    setGhostPoints(prev => {
      const { [levelId]: _, ...rest } = prev
      return rest
    })
  }, [])

  /**
   * Clear all ghost points
   */
  const clearAllGhosts = useCallback(() => {
    setGhostPoints({})
  }, [])

  /**
   * Get ghost point for a specific level
   * @param levelId - QC level ID
   * @returns Ghost point or undefined
   */
  const getGhost = useCallback((levelId: string): GhostPoint | undefined => {
    return ghostPoints[levelId]
  }, [ghostPoints])

  /**
   * Get all ghost points as an array
   * @returns Array of ghost points
   */
  const getAllGhosts = useCallback((): GhostPoint[] => {
    return Object.values(ghostPoints)
  }, [ghostPoints])

  /**
   * Check if any ghost points exist
   * @returns True if any ghost points exist
   */
  const hasGhosts = useCallback((): boolean => {
    return Object.keys(ghostPoints).length > 0
  }, [ghostPoints])

  /**
   * Get potential R-4s hint when multiple levels have values
   * This is a client-side preview only - official R-4s evaluation happens on server
   * @returns R-4s hint message or null
   */
  const getRFourSHint = useCallback((): string | null => {
    const ghosts = getAllGhosts()
    if (ghosts.length < 2) {
      if (ghosts.length === 1) {
        return 'Đợi mức khác để xét R-4s'
      }
      return null
    }

    // Check for potential R-4s: range between levels ≥ 4SD
    const zValues = ghosts.map(g => g.z)
    const maxZ = Math.max(...zValues)
    const minZ = Math.min(...zValues)
    const range = maxZ - minZ

    if (range >= 4) {
      return 'Potential R-4s (Δ≥4SD) - Chờ xác nhận sau khi lưu'
    }

    return null
  }, [getAllGhosts])

  return {
    // State
    ghostPoints,
    
    // Actions
    addGhost,
    clearGhost,
    clearAllGhosts,
    
    // Selectors
    getGhost,
    getAllGhosts,
    hasGhosts,
    
    // Hints
    getRFourSHint,
    
    // Utilities
    computeZ,
  }
}

export type UseGhostPointsReturn = ReturnType<typeof useGhostPoints>