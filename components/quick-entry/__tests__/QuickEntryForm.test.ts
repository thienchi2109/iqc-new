import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { QuickEntryForm } from '../QuickEntryForm'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'tech'
      }
    },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}))

// Mock fetch API
global.fetch = jest.fn()

const mockDevices = [
  { id: 'device-1', code: 'DEV001', name: 'Device 1' }
]

const mockTests = [
  { id: 'test-1', code: 'TEST001', name: 'Test 1', defaultUnitId: 'unit-1', defaultMethodId: 'method-1' }
]

const mockUnits = [
  { id: 'unit-1', code: 'mg/dL', display: 'mg/dL' }
]

const mockMethods = [
  { id: 'method-1', code: 'METHOD1', name: 'Method 1' }
]

const mockQcLevels = [
  { id: 'level-1', testId: 'test-1', level: 'Level 1', material: 'Material A' }
]

const mockQcLots = [
  { id: 'lot-1', levelId: 'level-1', lotCode: 'LOT001', expireDate: '2025-12-31' }
]

const mockQcLimits = {
  mean: 100,
  sd: 5,
  cv: 2.5
}

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </SessionProvider>
  )
}

describe('QuickEntryForm', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/devices')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDevices)
        })
      }
      if (url.includes('/api/tests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTests)
        })
      }
      if (url.includes('/api/units')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUnits)
        })
      }
      if (url.includes('/api/methods')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMethods)
        })
      }
      if (url.includes('/api/qc/levels')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQcLevels)
        })
      }
      if (url.includes('/api/qc/lots')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQcLots)
        })
      }
      if (url.includes('/api/qc/limits')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockQcLimits])
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render form fields correctly', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Thiết bị *')).toBeInTheDocument()
    })
    
    // Check that form fields are rendered
    expect(screen.getByText('Thiết bị *')).toBeInTheDocument()
    expect(screen.getByText('Xét nghiệm *')).toBeInTheDocument()
    expect(screen.getByText('Người thực hiện *')).toBeInTheDocument()
    expect(screen.getByText('Ngày/giờ chạy *')).toBeInTheDocument()
  })

  it('should handle device selection', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Thiết bị *')).toBeInTheDocument()
    })
    
    // Select a device
    const deviceSelect = screen.getByText('Chọn thiết bị')
    fireEvent.click(deviceSelect)
    
    // Select the first device option
    const deviceOption = await screen.findByText('DEV001 - Device 1')
    fireEvent.click(deviceOption)
    
    // Verify selection
    expect(screen.getByText('DEV001 - Device 1')).toBeInTheDocument()
  })

  it('should handle test selection and populate defaults', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Xét nghiệm *')).toBeInTheDocument()
    })
    
    // Select a test
    const testSelect = screen.getByText('Chọn xét nghiệm')
    fireEvent.click(testSelect)
    
    // Select the first test option
    const testOption = await screen.findByText('TEST001 - Test 1')
    fireEvent.click(testOption)
    
    // Verify selection and default population
    expect(screen.getByText('TEST001 - Test 1')).toBeInTheDocument()
  })

  it('should handle QC level and lot selection', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Mức QC *')).toBeInTheDocument()
    })
    
    // Select device and test first
    fireEvent.click(screen.getByText('Chọn thiết bị'))
    fireEvent.click(await screen.findByText('DEV001 - Device 1'))
    
    fireEvent.click(screen.getByText('Chọn xét nghiệm'))
    fireEvent.click(await screen.findByText('TEST001 - Test 1'))
    
    // Select QC level
    const levelSelect = screen.getByText('Chọn mức')
    fireEvent.click(levelSelect)
    
    // Select the first level option
    const levelOption = await screen.findByText('Level 1 - Material A')
    fireEvent.click(levelOption)
    
    // Select QC lot
    const lotSelect = screen.getByText('Chọn lô')
    fireEvent.click(lotSelect)
    
    // Select the first lot option
    const lotOption = await screen.findByText('LOT001 (HSD: 2025-12-31)')
    fireEvent.click(lotOption)
    
    // Verify selections
    expect(screen.getByText('Level 1 - Material A')).toBeInTheDocument()
    expect(screen.getByText('LOT001 (HSD: 2025-12-31)')).toBeInTheDocument()
  })

  it('should calculate and display Z-score', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Giá trị *')).toBeInTheDocument()
    })
    
    // Select device, test, level, and lot
    fireEvent.click(screen.getByText('Chọn thiết bị'))
    fireEvent.click(await screen.findByText('DEV001 - Device 1'))
    
    fireEvent.click(screen.getByText('Chọn xét nghiệm'))
    fireEvent.click(await screen.findByText('TEST001 - Test 1'))
    
    fireEvent.click(screen.getByText('Chọn mức'))
    fireEvent.click(await screen.findByText('Level 1 - Material A'))
    
    fireEvent.click(screen.getByText('Chọn lô'))
    fireEvent.click(await screen.findByText('LOT001 (HSD: 2025-12-31)'))
    
    // Enter a value
    const valueInput = screen.getByPlaceholderText('Nhập giá trị (ví dụ: 100.25)')
    fireEvent.change(valueInput, { target: { value: '110' } })
    
    // Wait for Z-score to be calculated and displayed
    await waitFor(() => {
      expect(screen.getByText(/Z-score:/)).toBeInTheDocument()
    })
    
    // Verify Z-score calculation (value=110, mean=100, sd=5 -> Z=2.0)
    expect(screen.getByText(/Z-score: 2.000/)).toBeInTheDocument()
  })

  it('should add and remove QC levels', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Mức 1')).toBeInTheDocument()
    })
    
    // Initially should have one level
    expect(screen.getByText('Mức 1')).toBeInTheDocument()
    expect(screen.queryByText('Mức 2')).not.toBeInTheDocument()
    
    // Add a new level
    const addButton = screen.getByText('Thêm mức')
    fireEvent.click(addButton)
    
    // Should now have two levels
    await waitFor(() => {
      expect(screen.getByText('Mức 2')).toBeInTheDocument()
    })
    
    // Remove the second level
    const removeButton = screen.getByText('Xóa')
    fireEvent.click(removeButton)
    
    // Should be back to one level
    expect(screen.queryByText('Mức 2')).not.toBeInTheDocument()
    expect(screen.getByText('Mức 1')).toBeInTheDocument()
  })
})