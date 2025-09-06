'use client'

import React from 'react'
import { GhostPoint } from '@/components/lj/useGhostPoints'

export interface RunHintsProps {
  ghostPoints: GhostPoint[]
  levels: { levelId: string; value: string }[]
  className?: string
}

export interface RFourSHint {
  type: 'waiting' | 'potential' | 'clear'
  message: string
  severity: 'info' | 'warning' | 'error'
  details?: {
    levelCount: number
    maxZ: number
    minZ: number
    range: number
    affectedLevels: string[]
  }
}

/**
 * RunHints component for displaying R-4s hints and other QC rule hints
 * Provides real-time feedback on potential Westgard rule violations
 */
export function RunHints({ ghostPoints, levels, className = '' }: RunHintsProps) {
  
  /**
   * Calculate R-4s hint based on current ghost points and form state
   */
  const calculateRFourSHint = (): RFourSHint | null => {
    // Get levels that have values entered (including ghost points)
    const levelsWithValues = levels.filter(level => level.value && !isNaN(parseFloat(level.value)))
    const ghostsWithZ = ghostPoints.filter(ghost => ghost.z !== null)
    
    // Combine form values and ghost points to get complete picture
    const activeCount = Math.max(levelsWithValues.length, ghostsWithZ.length)
    
    if (activeCount === 0) {
      return null // No values entered yet
    }
    
    if (activeCount === 1) {
      return {
        type: 'waiting',
        message: 'Đợi mức khác để xét R-4s',
        severity: 'info',
        details: {
          levelCount: activeCount,
          maxZ: 0,
          minZ: 0,
          range: 0,
          affectedLevels: ghostsWithZ.map(g => g.levelId)
        }
      }
    }
    
    // For 2+ levels, check potential R-4s
    if (ghostsWithZ.length >= 2) {
      const zValues = ghostsWithZ.map(g => g.z)
      const maxZ = Math.max(...zValues)
      const minZ = Math.min(...zValues)
      const range = maxZ - minZ
      
      if (range >= 4) {
        return {
          type: 'potential',
          message: 'Potential R-4s (Δ≥4SD) - Chờ xác nhận sau khi lưu',
          severity: 'warning',
          details: {
            levelCount: ghostsWithZ.length,
            maxZ,
            minZ,
            range,
            affectedLevels: ghostsWithZ.map(g => g.levelId)
          }
        }
      } else {
        return {
          type: 'clear',
          message: `R-4s: OK (Δ=${range.toFixed(1)}SD < 4SD)`,
          severity: 'info',
          details: {
            levelCount: ghostsWithZ.length,
            maxZ,
            minZ,
            range,
            affectedLevels: ghostsWithZ.map(g => g.levelId)
          }
        }
      }
    }
    
    return null
  }

  /**
   * Check for other potential Westgard hints (2of3-2s, etc.)
   */
  const calculateOtherHints = (): Array<{ message: string; severity: 'info' | 'warning' | 'error' }> => {
    const hints: Array<{ message: string; severity: 'info' | 'warning' | 'error' }> = []
    
    if (ghostPoints.length >= 3) {
      // Check 2of3-2s: Two of three levels beyond ±2SD
      const beyond2SD = ghostPoints.filter(g => Math.abs(g.z) > 2).length
      if (beyond2SD >= 2) {
        hints.push({
          message: `Potential 2of3-2s: ${beyond2SD} mức vượt ±2SD`,
          severity: 'warning'
        })
      }
    }
    
    // Check for extreme values (>3SD)
    const beyond3SD = ghostPoints.filter(g => Math.abs(g.z) > 3)
    if (beyond3SD.length > 0) {
      hints.push({
        message: `1-3s: ${beyond3SD.length} mức vượt ±3SD (loại bỏ)`,
        severity: 'error'
      })
    }
    
    // Check for warning levels (>2SD but <=3SD)
    const warning2SD = ghostPoints.filter(g => Math.abs(g.z) > 2 && Math.abs(g.z) <= 3)
    if (warning2SD.length > 0) {
      hints.push({
        message: `1-2s: ${warning2SD.length} mức vượt ±2SD (cảnh báo)`,
        severity: 'warning'
      })
    }
    
    return hints
  }

  const r4sHint = calculateRFourSHint()
  const otherHints = calculateOtherHints()
  
  // Don't render if no hints to show
  if (!r4sHint && otherHints.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* R-4s Hint */}
      {r4sHint && (
        <div className={`rounded-lg border p-3 ${
          r4sHint.severity === 'error' 
            ? 'bg-red-50 border-red-200' 
            : r4sHint.severity === 'warning'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center">
            <div className={`${
              r4sHint.severity === 'error' 
                ? 'text-red-700' 
                : r4sHint.severity === 'warning'
                ? 'text-yellow-700'
                : 'text-blue-700'
            }`}>
              {r4sHint.severity === 'error' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {r4sHint.severity === 'warning' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {r4sHint.severity === 'info' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-2 flex-1">
              <span className={`text-sm font-medium ${
                r4sHint.severity === 'error' 
                  ? 'text-red-800' 
                  : r4sHint.severity === 'warning'
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}>
                {r4sHint.message}
              </span>
              {r4sHint.details && r4sHint.type !== 'waiting' && (
                <div className={`text-xs mt-1 ${
                  r4sHint.severity === 'error' 
                    ? 'text-red-600' 
                    : r4sHint.severity === 'warning'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`}>
                  {r4sHint.details.levelCount} mức | 
                  Range: {r4sHint.details.range.toFixed(2)}SD |
                  Z: {r4sHint.details.minZ.toFixed(2)} to {r4sHint.details.maxZ.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Westgard Hints */}
      {otherHints.length > 0 && (
        <div className="space-y-2">
          {otherHints.map((hint, index) => (
            <div key={index} className={`rounded-lg border p-3 ${
              hint.severity === 'error' 
                ? 'bg-red-50 border-red-200' 
                : hint.severity === 'warning'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center">
                <div className={`${
                  hint.severity === 'error' 
                    ? 'text-red-700' 
                    : hint.severity === 'warning'
                    ? 'text-orange-700'
                    : 'text-gray-700'
                }`}>
                  {hint.severity === 'error' && '🚫'}
                  {hint.severity === 'warning' && '⚠️'}
                  {hint.severity === 'info' && 'ℹ️'}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  hint.severity === 'error' 
                    ? 'text-red-800' 
                    : hint.severity === 'warning'
                    ? 'text-orange-800'
                    : 'text-gray-800'
                }`}>
                  {hint.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Help text */}
      <div className="text-xs text-gray-500 italic">
        💡 Đây là xem trước phía client. Quyết định chính thức sẽ được đưa ra sau khi lưu dữ liệu.
      </div>
    </div>
  )
}

export default RunHints