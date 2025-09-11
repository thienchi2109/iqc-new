/**
 * Enhanced L-J Chart Demo Page
 * 
 * Shows integration of Rolling-N proposal functionality into existing L-J charts
 * Demonstrates the complete workflow from computation to approval
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  TrendingUp, 
  Settings, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { EnhancedLjChart } from '@/components/lj/EnhancedLjChart'
import { LjChart } from '@/components/lj/LjChart'
import { useQuery } from '@tanstack/react-query'

// Demo data
const DEMO_GROUPS = [
  {
    testCode: 'GLUC',
    level: 'L1' as const,
    lotCode: 'GLU240901',
    deviceCode: 'ARCH001',
    title: 'Glucose Level 1 - Architect 001'
  },
  {
    testCode: 'CHOL',
    level: 'L2' as const,
    lotCode: 'CHO240815',
    deviceCode: 'VITROS02',
    title: 'Cholesterol Level 2 - Vitros 02'
  },
  {
    testCode: 'ALB',
    level: 'L1' as const,
    lotCode: 'ALB240910',
    deviceCode: 'ARCH001',
    title: 'Albumin Level 1 - Architect 001'
  }
]

// Mock QC runs data
const generateMockRuns = (count: number) => {
  const runs = []
  const baseValue = 5.5
  const baseSd = 0.3
  
  for (let i = 0; i < count; i++) {
    const days = i * 0.5 // Runs every 12 hours
    const date = new Date()
    date.setDate(date.getDate() - (count - i) * 0.5)
    
    // Add some trend and random variation
    const trend = i * 0.001
    const noise = (Math.random() - 0.5) * baseSd * 2
    const value = baseValue + trend + noise
    
    const auto: 'pass' | 'warn' | 'fail' = Math.abs((value - baseValue) / baseSd) > 2 ? 'fail' : 
                  Math.abs((value - baseValue) / baseSd) > 1 ? 'warn' : 'pass'
    runs.push({
      id: `run-${i}`,
      value: Number(value.toFixed(3)),
      z: Number(((value - baseValue) / baseSd).toFixed(2)),
      runAt: date.toISOString(),
      createdAt: date.toISOString(),
      autoResult: auto,
  approvalState: 'approved' as 'approved',
      performerName: `Tech${(i % 3) + 1}`,
    })
  }
  
  return runs
}

// Mock current limits
const MOCK_CURRENT_LIMITS = {
  mean: 5.5,
  sd: 0.3,
  cv: 5.45,
  source: 'lab'
}

const MOCK_MANUFACTURER_LIMITS = {
  mean: 5.48,
  sd: 0.28,
  cv: 5.11,
  source: 'manufacturer'
}

export default function EnhancedLjChartDemoPage() {
  const [selectedGroup, setSelectedGroup] = useState(0)
  const [activeTab, setActiveTab] = useState('enhanced')
  
  const currentGroup = DEMO_GROUPS[selectedGroup]
  const mockRuns = generateMockRuns(50)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Enhanced L-J Charts Demo
          </h1>
          <p className="text-gray-600 mt-1">
            Rolling-N QC Limits Proposals with Enhanced Levey-Jennings Charts
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This demo shows the enhanced L-J chart with Rolling-N proposal functionality. 
          Select different QC groups and compare the enhanced version with the original chart.
        </AlertDescription>
      </Alert>

      {/* Group Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            QC Group Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_GROUPS.map((group, index) => (
              <Button
                key={index}
                variant={selectedGroup === index ? "default" : "outline"}
                onClick={() => setSelectedGroup(index)}
                className="flex flex-col items-start p-4 h-auto"
              >
                <div className="font-semibold">{group.title}</div>
                <div className="text-xs text-left mt-1 opacity-80">
                  {group.testCode} • {group.level} • {group.lotCode}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart Comparison */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enhanced" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Enhanced L-J Chart
            <Badge variant="secondary" className="ml-1">
              New
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="original" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Original L-J Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="mt-6">
          <EnhancedLjChart
            testCode={currentGroup.testCode}
            level={currentGroup.level}
            lotCode={currentGroup.lotCode}
            deviceCode={currentGroup.deviceCode}
            runs={mockRuns}
            currentLimits={MOCK_CURRENT_LIMITS}
            manufacturerLimits={MOCK_MANUFACTURER_LIMITS}
            title={currentGroup.title}
            height={500}
          />
        </TabsContent>

        <TabsContent value="original" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentGroup.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <LjChart
                limits={MOCK_CURRENT_LIMITS}
                runs={mockRuns}
                height={500}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Enhanced Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Multiple overlay sources (Current, Manufacturer, Rolling-N)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Rolling-N proposal computation and workflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Real-time proposal visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Integrated approval workflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Professional shadcn/ui components</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Audit trail and versioned limits</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Implementation Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p>
                <strong>Database Foundation:</strong> Versioned QC limits with proposal tracking
              </p>
              <p>
                <strong>Rolling-N Engine:</strong> Statistical computation with Westgard rule exclusions
              </p>
              <p>
                <strong>API Layer:</strong> Complete CRUD operations for proposal lifecycle
              </p>
              <p>
                <strong>React Integration:</strong> TanStack Query hooks with automatic cache management
              </p>
              <p>
                <strong>UI Components:</strong> Modern shadcn/ui with responsive design
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to Replace Existing L-J Charts:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Import <code className="bg-gray-200 px-1 rounded">EnhancedLjChart</code> instead of <code className="bg-gray-200 px-1 rounded">LjChart</code></li>
              <li>Add required props: <code className="bg-gray-200 px-1 rounded">testCode</code>, <code className="bg-gray-200 px-1 rounded">level</code>, <code className="bg-gray-200 px-1 rounded">lotCode</code>, <code className="bg-gray-200 px-1 rounded">deviceCode</code></li>
              <li>Provide current and manufacturer limits as separate props</li>
              <li>All existing props (runs, ghostPoints, isLoading, etc.) remain compatible</li>
            </ol>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-800">Example Usage:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`<EnhancedLjChart
  testCode="GLUC"
  level="L1"
  lotCode="GLU240901"
  deviceCode="ARCH001"
  runs={qcRuns}
  currentLimits={currentLimits}
  manufacturerLimits={manufacturerLimits}
  ghostPoints={ghostPoints}
  isLoading={isLoading}
  title="Glucose L1 - Architect 001"
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
