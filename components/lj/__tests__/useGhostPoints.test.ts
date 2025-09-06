import { renderHook, act } from '@testing-library/react-hooks'
import { useGhostPoints } from '../useGhostPoints'

describe('useGhostPoints', () => {
  it('should add and clear ghost points correctly', () => {
    const { result } = renderHook(() => useGhostPoints())
    
    // Initially no ghost points
    expect(result.current.hasGhosts()).toBe(false)
    expect(result.current.getAllGhosts()).toEqual([])
    
    // Add a ghost point
    act(() => {
      result.current.addGhost('level-1', 100, 95, 2)
    })
    
    // Should have one ghost point
    expect(result.current.hasGhosts()).toBe(true)
    expect(result.current.getAllGhosts()).toHaveLength(1)
    expect(result.current.getGhost('level-1')).toBeDefined()
    
    // Clear the ghost point
    act(() => {
      result.current.clearGhost('level-1')
    })
    
    // Should be back to no ghost points
    expect(result.current.hasGhosts()).toBe(false)
    expect(result.current.getAllGhosts()).toEqual([])
    expect(result.current.getGhost('level-1')).toBeUndefined()
  })

  it('should compute Z-score correctly', () => {
    const { result } = renderHook(() => useGhostPoints())
    
    // Test valid calculation
    const z1 = result.current.computeZ(100, 95, 2)
    expect(z1).toBe(2.5)
    
    // Test invalid cases
    expect(result.current.computeZ(100, 95, 0)).toBeNull() // SD = 0
    expect(result.current.computeZ(100, 95, -1)).toBeNull() // SD < 0
    expect(result.current.computeZ(NaN, 95, 2)).toBeNull() // Invalid value
    expect(result.current.computeZ(100, NaN, 2)).toBeNull() // Invalid mean
  })

  it('should determine color based on Z-score', () => {
    const { result } = renderHook(() => useGhostPoints())
    
    // Test different Z-score ranges
    expect(result.current.getColorForZ(0.5)).toBe('#16a34a') // green - acceptable
    expect(result.current.getColorForZ(1.5)).toBe('#d97706') // amber - caution
    expect(result.current.getColorForZ(2.5)).toBe('#ea580c') // orange - warn
    expect(result.current.getColorForZ(3.5)).toBe('#dc2626') // red - fail
  })

  it('should determine side based on Z-score', () => {
    const { result } = renderHook(() => useGhostPoints())
    
    // Test different sides
    expect(result.current.getSideForZ(0.5)).toBe('above')
    expect(result.current.getSideForZ(-0.5)).toBe('below')
    expect(result.current.getSideForZ(0.05)).toBe('on') // Within tolerance
    expect(result.current.getSideForZ(-0.05)).toBe('on') // Within tolerance
  })

  it('should detect potential R-4s hints', () => {
    const { result } = renderHook(() => useGhostPoints())
    
    // No ghosts - should return null
    expect(result.current.getRFourSHint()).toBeNull()
    
    // One ghost - should wait for another
    act(() => {
      result.current.addGhost('level-1', 100, 95, 2) // Z = 2.5
    })
    const hint1 = result.current.getRFourSHint()
    expect(hint1).toContain('Đợi mức khác để xét R-4s')
    
    // Two ghosts with potential R-4s
    act(() => {
      result.current.addGhost('level-2', 85, 95, 2) // Z = -5.0
    })
    const hint2 = result.current.getRFourSHint()
    expect(hint2).toContain('Potential R-4s')
    expect(hint2).toContain('Δ≥4SD')
  })
})