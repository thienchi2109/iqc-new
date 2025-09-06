import { render, screen } from '@testing-library/react'
import { RunHints } from '../RunHints'

describe('RunHints', () => {
  const mockGhostPoints = [
    {
      levelId: 'level-1',
      value: 110,
      z: 2.0,
      time: new Date(),
      color: '#ea580c',
      side: 'above'
    },
    {
      levelId: 'level-2',
      value: 90,
      z: -2.0,
      time: new Date(),
      color: '#ea580c',
      side: 'below'
    }
  ]

  const mockLevels = [
    { levelId: 'level-1', value: '110' },
    { levelId: 'level-2', value: '90' }
  ]

  it('should render R-4s hint when two levels have opposite Z-scores with range >= 4', () => {
    render(<RunHints ghostPoints={mockGhostPoints} levels={mockLevels} />)
    
    expect(screen.getByText('Potential R-4s (Δ≥4SD) - Chờ xác nhận sau khi lưu')).toBeInTheDocument()
    expect(screen.getByText('2 mức | Range: 4.00SD | Z: -2.00 to 2.00')).toBeInTheDocument()
  })

  it('should render waiting message when only one level has value', () => {
    const singleLevel = [{ levelId: 'level-1', value: '100' }]
    const singleGhost = [mockGhostPoints[0]]
    
    render(<RunHints ghostPoints={singleGhost} levels={singleLevel} />)
    
    expect(screen.getByText('Đợi mức khác để xét R-4s')).toBeInTheDocument()
  })

  it('should render 1-2s warning when values exceed 2SD', () => {
    render(<RunHints ghostPoints={mockGhostPoints} levels={mockLevels} />)
    
    expect(screen.getByText('1-2s: 2 mức vượt ±2SD (cảnh báo)')).toBeInTheDocument()
  })

  it('should render 1-3s error when values exceed 3SD', () => {
    const extremeGhostPoints = [
      { ...mockGhostPoints[0], z: 3.5 },
      { ...mockGhostPoints[1], z: -3.5 }
    ]
    
    render(<RunHints ghostPoints={extremeGhostPoints} levels={mockLevels} />)
    
    expect(screen.getByText('1-3s: 2 mức vượt ±3SD (loại bỏ)')).toBeInTheDocument()
  })

  it('should render R-4s OK message when range is less than 4SD', () => {
    const closeGhostPoints = [
      { ...mockGhostPoints[0], z: 1.5 },
      { ...mockGhostPoints[1], z: -1.5 }
    ]
    
    render(<RunHints ghostPoints={closeGhostPoints} levels={mockLevels} />)
    
    expect(screen.getByText('R-4s: OK (Δ=3.0SD < 4SD)')).toBeInTheDocument()
  })

  it('should not render when no hints are available', () => {
    const { container } = render(<RunHints ghostPoints={[]} levels={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render 2of3-2s hint when 3+ levels and 2+ exceed 2SD', () => {
    const threeLevels = [
      ...mockLevels,
      { levelId: 'level-3', value: '115' }
    ]
    
    const threeGhostPoints = [
      ...mockGhostPoints,
      { ...mockGhostPoints[0], levelId: 'level-3', z: 3.0 }
    ]
    
    render(<RunHints ghostPoints={threeGhostPoints} levels={threeLevels} />)
    
    expect(screen.getByText('Potential 2of3-2s: 3 mức vượt ±2SD')).toBeInTheDocument()
  })
})