import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  description?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-indigo-500 bg-indigo-50 p-2 rounded-lg">{icon}</div>}
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-extrabold text-slate-900">{value}</span>
        {description && <span className="text-sm text-slate-400 mt-1">{description}</span>}
      </div>
    </div>
  )
}
