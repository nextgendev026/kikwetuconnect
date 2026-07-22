'use client'

import { useState } from 'react'
import { Shield, X, Check, AlertTriangle, User, MessageSquare, MoreVertical } from 'lucide-react'

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-gray-500/20 text-gray-400',
}

interface Report {
  id: string
  status: string
  reason: string
  evidence: string | null
  target_type: string
  target_id: string
  reporter: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  } | null
  created_at: string
  reviewer: {
    id: string
    username: string
    full_name: string | null
  } | null
  resolved_at: string | null
}

interface ModerationCardProps {
  report: Report
}

export function ModerationCard({ report }: ModerationCardProps) {
  const [action, setAction] = useState<'approve' | 'remove' | 'warn' | ''>('')

  const handleAction = async (type: string) => {
    // This would call an API route
    console.log('Action:', type, 'Report:', report.id)
    // In a real app, call the API route to update moderation status
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`badge ${statusColors[report.status as keyof typeof statusColors]}`}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
            <span className="text-xs text-faint">#{report.id.slice(0, 8)}</span>
            <span className="text-xs text-faint">{new Date(report.created_at).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm mb-3">
            <User className="w-4 h-4 text-quiet" />
            <span>Reported by: </span>
            <strong className="text-text">{report.reporter?.username || 'Unknown'}</strong>
            <span className="text-quiet">· Reason: {report.reason}</span>
          </div>

          <div className="p-3 bg-surface-2 rounded-lg border border-line-soft">
            <p className="text-sm">{report.evidence || 'No additional evidence provided'}</p>
          </div>

          {report.target_type === 'post' && (
            <div className="mt-3 p-3 bg-surface-2 rounded-lg border border-line-soft">
              <p className="text-sm text-quiet">Target: Post (ID: {report.target_id.slice(0, 8)}...)</p>
            </div>
          )}

          {report.target_type === 'answer' && (
            <div className="mt-3 p-3 bg-surface-2 rounded-lg border border-line-soft">
              <p className="text-sm text-quiet">Target: Answer (ID: {report.target_id.slice(0, 8)}...)</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {report.status === 'pending' && (
            <>
              <button
                onClick={() => handleAction('remove')}
                className="btn-danger text-sm"
              >
                Remove Content
              </button>
              <button
                onClick={() => handleAction('warn')}
                className="btn-gold text-sm"
              >
                Warn User
              </button>
              <button
                onClick={() => handleAction('dismiss')}
                className="btn-secondary text-sm"
              >
                Dismiss Report
              </button>
            </>
          )}

          {report.status !== 'pending' && (
            <div className="text-sm text-quiet">
              <User className="w-3.5 h-3.5 inline" />
              Reviewed by {report.reviewer?.username || 'Unknown'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}