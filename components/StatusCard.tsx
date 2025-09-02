'use client'

interface StatusCardProps {
  title: string
  count: number
  color: 'green' | 'yellow' | 'red' | 'blue'
  icon?: React.ReactNode
}

export default function StatusCard({ title, count, color, icon }: StatusCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const iconClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }

  return (
    <div className={`p-6 rounded-2xl border shadow-md ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-1">{count}</p>
        </div>
        {icon && (
          <div className={`text-2xl ${iconClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}