'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface BulkRejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  selectedCount: number
  isLoading?: boolean
}

export function BulkRejectModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedCount, 
  isLoading = false 
}: BulkRejectModalProps) {
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    if (!note.trim()) return
    onConfirm(note.trim())
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Từ chối hàng loạt</DialogTitle>
          <DialogDescription>
            Bạn đang từ chối {selectedCount} lần chạy QC. Vui lòng nhập lý do từ chối.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Thao tác này sẽ từ chối tất cả {selectedCount} lần chạy được chọn. 
              Lý do từ chối sẽ được áp dụng cho tất cả các lần chạy.
            </p>
          </div>
          
          <div>
            <Label htmlFor="bulk-reject-note">
              Lý do từ chối *
            </Label>
            <Textarea
              id="bulk-reject-note"
              placeholder="Nhập lý do từ chối cho tất cả các lần chạy được chọn..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              rows={4}
              required
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !note.trim()}
          >
            {isLoading ? 'Đang xử lý...' : `Từ chối ${selectedCount} mục`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
