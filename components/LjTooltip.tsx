'use client'

import React from 'react'

interface LjTooltipData {
  id: string
  value: number
  z?: number
  createdAt: string
  deviceCode?: string
  testCode?: string
  level?: string
  performerName?: string
  approverName?: string
  status?: string
  autoResult?: string
  notes?: string
}

interface LjTooltipProps {
  data: LjTooltipData
  className?: string
}

export default function LjTooltip({ data, className = '' }: LjTooltipProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getAutoResultColor = (autoResult?: string) => {
    switch (autoResult) {
      case 'pass': return 'text-green-600'
      case 'fail': return 'text-red-600'
      case 'warn': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm ${className}`}>
      <div className="space-y-2 text-sm">
        {/* QC Run Details */}
        <div className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Chi tiết QC Run
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-600">Giá trị:</div>
          <div className="font-medium">{data.value.toFixed(2)}</div>
          
          {data.z !== undefined && (
            <>
              <div className="text-gray-600">Z-score:</div>
              <div className="font-medium">{data.z.toFixed(3)}</div>
            </>
          )}
          
          <div className="text-gray-600">Thời gian:</div>
          <div className="font-medium">{formatDateTime(data.createdAt)}</div>
        </div>

        {/* Test Information */}
        {(data.deviceCode || data.testCode || data.level) && (
          <>
            <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1 pt-2">
              Thông tin Test
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.deviceCode && (
                <>
                  <div className="text-gray-600">Thiết bị:</div>
                  <div className="font-medium">{data.deviceCode}</div>
                </>
              )}
              {data.testCode && (
                <>
                  <div className="text-gray-600">Xét nghiệm:</div>
                  <div className="font-medium">{data.testCode}</div>
                </>
              )}
              {data.level && (
                <>
                  <div className="text-gray-600">Mức:</div>
                  <div className="font-medium">{data.level}</div>
                </>
              )}
            </div>
          </>
        )}

        {/* Personnel Information */}
        {(data.performerName || data.approverName) && (
          <>
            <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1 pt-2">
              Nhân sự
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.performerName && (
                <>
                  <div className="text-gray-600">Người thực hiện:</div>
                  <div className="font-medium">{data.performerName}</div>
                </>
              )}
              {data.approverName && (
                <>
                  <div className="text-gray-600">Người duyệt:</div>
                  <div className="font-medium">{data.approverName}</div>
                </>
              )}
            </div>
          </>
        )}

        {/* Status Information */}
        {(data.status || data.autoResult) && (
          <>
            <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1 pt-2">
              Trạng thái
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.status && (
                <>
                  <div className="text-gray-600">Trạng thái:</div>
                  <div className={`font-medium ${getStatusColor(data.status)}`}>
                    {data.status === 'accepted' ? 'Đã chấp nhận' :
                     data.status === 'rejected' ? 'Đã từ chối' : 'Chờ xử lý'}
                  </div>
                </>
              )}
              {data.autoResult && (
                <>
                  <div className="text-gray-600">Kết quả tự động:</div>
                  <div className={`font-medium ${getAutoResultColor(data.autoResult)}`}>
                    {data.autoResult === 'pass' ? 'Đạt' :
                     data.autoResult === 'fail' ? 'Không đạt' : 'Cảnh báo'}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {data.notes && (
          <>
            <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1 pt-2">
              Ghi chú
            </div>
            <div className="text-gray-700 text-xs bg-gray-50 p-2 rounded">
              {data.notes}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Export a simplified version for use in table cells
export function LjTooltipInline({ data }: { data: LjTooltipData }) {
  return (
    <div className="text-xs text-gray-600">
      <div><strong>Người thực hiện:</strong> {data.performerName || 'N/A'}</div>
      <div><strong>Thời gian:</strong> {new Date(data.createdAt).toLocaleString('vi-VN')}</div>
      {data.z !== undefined && (
        <div><strong>Z-score:</strong> {data.z.toFixed(3)}</div>
      )}
      {data.notes && (
        <div><strong>Ghi chú:</strong> {data.notes}</div>
      )}
    </div>
  )
}