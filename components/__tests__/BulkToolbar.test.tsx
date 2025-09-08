import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { BulkToolbar } from '../BulkToolbar'

// Mock next-auth session
const mockSession = {
  user: {
    id: '1',
    email: 'test@example.com',
    role: 'supervisor',
  },
  expires: '2024-12-31',
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
  
  TestWrapper.displayName = 'TestWrapper'
  
  return TestWrapper
}

describe('BulkToolbar', () => {
  const mockOnBulkApprove = jest.fn()
  const mockOnBulkReject = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when selectedCount is 0', () => {
    render(
      <BulkToolbar
        selectedCount={0}
        onBulkApprove={mockOnBulkApprove}
        onBulkReject={mockOnBulkReject}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument()
  })

  it('should render when selectedCount > 0', () => {
    render(
      <BulkToolbar
        selectedCount={3}
        onBulkApprove={mockOnBulkApprove}
        onBulkReject={mockOnBulkReject}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Đã chọn 3 mục')).toBeInTheDocument()
    expect(screen.getByText('Duyệt hàng loạt')).toBeInTheDocument()
    expect(screen.getByText('Từ chối hàng loạt')).toBeInTheDocument()
  })

  it('should call onBulkApprove when approve button is clicked', () => {
    render(
      <BulkToolbar
        selectedCount={2}
        onBulkApprove={mockOnBulkApprove}
        onBulkReject={mockOnBulkReject}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByText('Duyệt hàng loạt'))
    expect(mockOnBulkApprove).toHaveBeenCalledTimes(1)
  })

  it('should call onBulkReject when reject button is clicked', () => {
    render(
      <BulkToolbar
        selectedCount={2}
        onBulkApprove={mockOnBulkApprove}
        onBulkReject={mockOnBulkReject}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByText('Từ chối hàng loạt'))
    expect(mockOnBulkReject).toHaveBeenCalledTimes(1)
  })

  it('should disable buttons when loading', () => {
    render(
      <BulkToolbar
        selectedCount={2}
        onBulkApprove={mockOnBulkApprove}
        onBulkReject={mockOnBulkReject}
        isLoading={true}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Duyệt hàng loạt')).toBeDisabled()
    expect(screen.getByText('Từ chối hàng loạt')).toBeDisabled()
  })
})
