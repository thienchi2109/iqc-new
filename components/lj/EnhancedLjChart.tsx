/**
 * Enhanced Levey-Jennings Chart with Rolling-N Proposal Integration
 * 
 * Features:
 * - Overlay selector for different limit types (Manufacturer/Current/Rolling-N Proposal)
 * - Compute Rolling-N Proposal workflow
 * - Professional shadcn/ui components
 * - Real-time proposal visualization
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SimpleSelect from '@/components/ui/SimpleSelect'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react'
// Switch to legacy chart for visuals (reference lines, connecting lines)
import { LeveyJenningsChart, type QcRun as LegacyQcRun, type QcLimits as LegacyQcLimits } from './LeveyJenningsChart'
import { GhostPoint } from './useGhostPoints'
import { 
  useComputeRollingProposal, 
  useCreateProposal, 
  type RollingProposalResult 
} from '@/hooks/catalog/useQcLimitProposals'

// Overlay types for limit visualization
type OverlayType = 'current' | 'manufacturer' | 'rolling-proposal'

interface OverlayLimits extends LegacyQcLimits {
  source: string
  type: OverlayType
  proposal?: RollingProposalResult
  cv?: number
}

export interface EnhancedLjChartProps {
  // Chart data
  runs?: LegacyQcRun[]
  ghostPoints?: GhostPoint[]
  isLoading?: boolean
  
  // Group identification for proposals
  testCode: string
  level: 'L1' | 'L2' | 'L3'
  lotCode: string
  deviceCode: string
  
  // Current limits data
  currentLimits?: (LegacyQcLimits & { source: string; cv?: number })
  manufacturerLimits?: (LegacyQcLimits & { source: string; cv?: number })
  
  // Display options
  title?: string
  className?: string
  height?: number
}

export function EnhancedLjChart({
  runs = [],
  ghostPoints = [],
  isLoading = false,
  testCode,
  level,
  lotCode,
  deviceCode,
  currentLimits,
  manufacturerLimits,
  title,
  className = '',
  height = 400,
}: EnhancedLjChartProps) {
  // State for overlay selection and proposal workflow
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayType>('current')
  const [rollingN, setRollingN] = useState(20)
  const [showProposalDialog, setShowProposalDialog] = useState(false)
  const [proposalResult, setProposalResult] = useState<RollingProposalResult | null>(null)

  // Hooks for proposal operations
  const computeProposal = useComputeRollingProposal()
  const createProposal = useCreateProposal()

  // Available overlays based on data
  const availableOverlays = useMemo(() => {
    const overlays: { value: OverlayType; label: string; limits?: OverlayLimits }[] = []
    
    if (currentLimits) {
      overlays.push({
        value: 'current',
        label: 'Hiện tại (Current)',
        limits: { ...currentLimits, type: 'current' }
      })
    }
    
    if (manufacturerLimits) {
      overlays.push({
        value: 'manufacturer',
        label: 'Nhà sản xuất (Manufacturer)',
        limits: { ...manufacturerLimits, type: 'manufacturer' }
      })
    }
    
    if (proposalResult?.eligible) {
      overlays.push({
        value: 'rolling-proposal',
        label: `Rolling-N (N=${proposalResult.window?.n})`,
        limits: proposalResult.stats ? {
          mean: proposalResult.stats.mean,
          sd: proposalResult.stats.sd,
          cv: proposalResult.stats.cv,
          source: 'lab',
          type: 'rolling-proposal',
          proposal: proposalResult
        } : undefined
      })
    }
    
    return overlays
  }, [currentLimits, manufacturerLimits, proposalResult])

  // Get current limits to display
  const displayLimits = availableOverlays.find(o => o.value === selectedOverlay)?.limits

  // Handle compute proposal
  const handleComputeProposal = async () => {
    try {
      const result = await computeProposal.mutateAsync({
        testCode,
        level,
        lotCode,
        deviceCode,
        n: rollingN,
      })
      
      setProposalResult(result)
      if (result.eligible) {
        setSelectedOverlay('rolling-proposal')
      }
    } catch (error) {
      console.error('Failed to compute proposal:', error)
    }
  }

  // Handle create proposal
  const handleCreateProposal = async (notes?: string) => {
    if (!proposalResult?.eligible) return
    
    try {
      await createProposal.mutateAsync({
        testCode,
        level,
        lotCode,
        deviceCode,
        n: rollingN,
        notes,
      })
      
      setShowProposalDialog(false)
      // Show success notification or redirect to approval inbox
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">
            {title || `L-J Chart: ${testCode} ${level} - ${deviceCode}`}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Overlay Selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="overlay-select" className="text-sm font-medium">
                Giới hạn:
              </Label>
              <SimpleSelect
                options={availableOverlays.map(overlay => ({
                  value: overlay.value,
                  label: overlay.label
                }))}
                value={selectedOverlay}
                onChange={(value: string) => setSelectedOverlay(value as OverlayType)}
                className="w-48"
              />
            </div>

            {/* Rolling-N Proposal Button */}
            <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  disabled={computeProposal.isPending}
                >
                  <Calculator className="h-4 w-4" />
                  Rolling-N
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Compute Rolling-N QC Limits Proposal</DialogTitle>
                </DialogHeader>
                <RollingProposalDialog
                  testCode={testCode}
                  level={level}
                  lotCode={lotCode}
                  deviceCode={deviceCode}
                  rollingN={rollingN}
                  setRollingN={setRollingN}
                  proposalResult={proposalResult}
                  isComputing={computeProposal.isPending}
                  isCreating={createProposal.isPending}
                  onCompute={handleComputeProposal}
                  onCreate={handleCreateProposal}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Display current overlay info */}
        {displayLimits && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {displayLimits.type === 'current' && 'Hiện tại'}
              {displayLimits.type === 'manufacturer' && 'Nhà sản xuất'}
              {displayLimits.type === 'rolling-proposal' && 'Rolling-N Proposal'}
            </Badge>
            <span className="text-sm text-gray-600">
              Mean: {Number(displayLimits.mean).toFixed(3)} | 
              SD: {Number(displayLimits.sd).toFixed(3)}
              {typeof displayLimits.cv === 'number' && (
                <> | CV: {Number(displayLimits.cv).toFixed(1)}%</>
              )}
            </span>
            {displayLimits.type === 'rolling-proposal' && displayLimits.proposal && (
              <Badge variant="secondary" className="text-xs">
                N={displayLimits.proposal.window?.n} | 
                {displayLimits.proposal.window?.span_days} days
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Use legacy LeveyJenningsChart for styling/appearance (reference lines, connecting lines) */}
        <LeveyJenningsChart
          runs={runs}
          limits={displayLimits ? { mean: Number(displayLimits.mean), sd: Number(displayLimits.sd) } : undefined}
          height={height}
          className="w-full"
        />
      </CardContent>
    </Card>
  )
}

// Rolling-N Proposal Dialog Component
interface RollingProposalDialogProps {
  testCode: string
  level: string
  lotCode: string
  deviceCode: string
  rollingN: number
  setRollingN: (n: number) => void
  proposalResult: RollingProposalResult | null
  isComputing: boolean
  isCreating: boolean
  onCompute: () => void
  onCreate: (notes?: string) => void
}

function RollingProposalDialog({
  testCode,
  level,
  lotCode,
  deviceCode,
  rollingN,
  setRollingN,
  proposalResult,
  isComputing,
  isCreating,
  onCompute,
  onCreate,
}: RollingProposalDialogProps) {
  const [notes, setNotes] = useState('')

  return (
    <div className="space-y-4">
      {/* Group Info */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Group Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Test: <span className="font-mono">{testCode}</span></div>
          <div>Level: <span className="font-mono">{level}</span></div>
          <div>Lot: <span className="font-mono">{lotCode}</span></div>
          <div>Device: <span className="font-mono">{deviceCode}</span></div>
        </div>
      </div>

      {/* Rolling N Input */}
      <div className="space-y-2">
        <Label htmlFor="rolling-n">Rolling Window Size (N)</Label>
        <Input
          id="rolling-n"
          type="number"
          value={rollingN}
          onChange={(e) => setRollingN(Math.max(20, parseInt(e.target.value) || 20))}
          min={20}
          max={200}
          className="w-full"
        />
        <p className="text-xs text-gray-500">
          Minimum 20 in-control runs required
        </p>
      </div>

      {/* Compute Button */}
      <Button 
        onClick={onCompute} 
        disabled={isComputing}
        className="w-full"
      >
        {isComputing ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Computing...
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4 mr-2" />
            Compute Proposal
          </>
        )}
      </Button>

      {/* Results */}
      {proposalResult && (
        <div className="space-y-3">
          {/* Eligibility Status */}
          <Alert variant={proposalResult.eligible ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {proposalResult.eligible ? (
                <span className="text-green-700 font-medium">✓ Eligible for Rolling-N proposal</span>
              ) : (
                <span className="text-red-700 font-medium">✗ Not eligible for Rolling-N proposal</span>
              )}
            </AlertDescription>
          </Alert>

          {/* Reasons */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Reasons:</Label>
            <ul className="text-sm space-y-1">
              {proposalResult.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Statistics (if eligible) */}
          {proposalResult.eligible && proposalResult.stats && proposalResult.window && (
            <div className="bg-green-50 p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm text-green-800">Proposed Statistics</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Mean</div>
                  <div className="font-mono font-medium">{proposalResult.stats.mean.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">SD</div>
                  <div className="font-mono font-medium">{proposalResult.stats.sd.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">CV%</div>
                  <div className="font-mono font-medium">{proposalResult.stats.cv.toFixed(2)}%</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Based on {proposalResult.window.n} in-control runs over {proposalResult.window.span_days} days
                {proposalResult.excludedCount > 0 && ` (${proposalResult.excludedCount} excluded)`}
              </div>
            </div>
          )}

          {/* Current vs Proposed Comparison */}
          {proposalResult.eligible && proposalResult.currentLimits && proposalResult.stats && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm text-blue-800">Current vs Proposed</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-gray-600">Parameter</div>
                  <div>Mean</div>
                  <div>SD</div>
                  <div>CV%</div>
                </div>
                <div>
                  <div className="text-gray-600">Current</div>
                  <div className="font-mono">{proposalResult.currentLimits.mean.toFixed(4)}</div>
                  <div className="font-mono">{proposalResult.currentLimits.sd.toFixed(4)}</div>
                  <div className="font-mono">{proposalResult.currentLimits.cv.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Proposed</div>
                  <div className="font-mono">{proposalResult.stats.mean.toFixed(4)}</div>
                  <div className="font-mono">{proposalResult.stats.sd.toFixed(4)}</div>
                  <div className="font-mono">{proposalResult.stats.cv.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Create Proposal Section */}
          {proposalResult.eligible && (
            <div className="space-y-3 pt-3 border-t">
              <Label htmlFor="proposal-notes">Notes (Optional)</Label>
              <textarea
                id="proposal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this proposal..."
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
              />
              <Button 
                onClick={() => onCreate(notes)}
                disabled={isCreating}
                className="w-full"
                variant="default"
              >
                {isCreating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating Proposal...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Create Proposal for Approval
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
