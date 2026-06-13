import { useState } from 'react'
import { Badge } from '@/components/retroui/Badge'
import { Button } from '@/components/retroui/Button'
import { Progress } from '@/components/retroui/Progress'
import { Input } from '@/components/retroui/Input'
import { useGoalDispatch } from './useGoalStore'
import { STATUS_LABEL } from './types'
import type { GoalRun, GoalStatus } from './types'

const STATUS_VARIANT: Record<GoalStatus, 'default' | 'outline' | 'solid' | 'surface'> = {
  queued: 'outline',
  running: 'default',
  waiting_human: 'solid',
  paused: 'outline',
  completed: 'surface',
  failed: 'outline',
  cancelled: 'outline',
}

const STATUS_OVERRIDE: Record<GoalStatus, string> = {
  queued: '',
  running: '',
  waiting_human: 'border-2 border-amber-800 bg-amber-300 text-amber-900',
  paused: '',
  completed: 'border-2 border-green-600 bg-green-100 text-green-800',
  failed: 'border-2 border-red-600 bg-red-100 text-red-800',
  cancelled: 'text-muted-foreground line-through',
}

const BORDER_LEFT: Record<GoalStatus, string> = {
  queued: 'border-l-gray-400',
  running: 'border-l-primary',
  waiting_human: 'border-l-amber-500',
  paused: 'border-l-gray-400',
  completed: 'border-l-green-500',
  failed: 'border-l-red-500',
  cancelled: 'border-l-gray-300',
}

const CARD_BG: Record<GoalStatus, string> = {
  queued: '',
  running: 'bg-yellow-50/50',
  waiting_human: 'bg-amber-50/70',
  paused: '',
  completed: '',
  failed: 'bg-red-50/40',
  cancelled: 'opacity-60',
}

interface RunCardProps {
  run: GoalRun
  onClick?: () => void
}

export default function RunCard({ run, onClick }: RunCardProps) {
  const dispatch = useGoalDispatch()
  const [reply, setReply] = useState('')
  const pct = run.maxIter > 0 ? Math.round((run.iter / run.maxIter) * 100) : 0
  const isActive = run.status === 'running' || run.status === 'waiting_human'

  function handlePause() { dispatch({ type: 'UPDATE_STATUS', id: run.id, status: 'paused' }) }
  function handleResume() { dispatch({ type: 'UPDATE_STATUS', id: run.id, status: 'running' }) }
  function handleStop() { dispatch({ type: 'UPDATE_STATUS', id: run.id, status: 'cancelled' }) }
  function handleReply() {
    if (!reply.trim()) return
    dispatch({ type: 'REPLY_RUN', id: run.id, reply: reply.trim() })
    setReply('')
  }
  function handleRetry() { dispatch({ type: 'UPDATE_STATUS', id: run.id, status: 'queued' }) }

  return (
    <div
      className={`
        group border-2 shadow-md hover:shadow-lg
        border-l-[4px] ${BORDER_LEFT[run.status]}
        ${CARD_BG[run.status] || 'bg-white'}
        cursor-pointer transition-shadow
      `}
      onClick={onClick}
    >
      <div className="p-3 space-y-1.5">
        {/* Top row: ID + name + status */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums select-none">
            {run.id}
          </span>
          <span className="font-medium text-[13px] truncate">{run.name}</span>
          <span className="ml-auto shrink-0">
            <Badge variant={STATUS_VARIANT[run.status]} className={STATUS_OVERRIDE[run.status]}>
              {STATUS_LABEL[run.status]}
            </Badge>
          </span>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono tabular-nums">
          <span>{run.iter}/{run.maxIter}</span>
          <span className="text-gray-300">·</span>
          <span>{formatToken(run.tokens)}/{formatToken(run.tokenBudget)}</span>
          <span className="text-gray-300">·</span>
          <span>{run.duration}</span>
          {run.sandbox === 'lap' && (
            <Badge variant="outline" className="text-[9px] font-sans py-0">LAP</Badge>
          )}
        </div>

        {/* Activity */}
        {(run.activity && isActive) && (
          <div className="text-[11px] text-muted-foreground">
            {run.activity}
          </div>
        )}

        {/* Progress */}
        {isActive && (
          <div className="space-y-0.5">
            <Progress value={pct} />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono tabular-nums">
              <span>{pct}%</span>
              <span>{run.iter}/{run.maxIter} 迭代</span>
            </div>
          </div>
        )}

        {/* Question prompt */}
        {run.status === 'waiting_human' && run.question && (
          <div className="border-2 border-amber-500 bg-amber-50 p-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500" />
              <span className="text-[12px] font-head font-semibold text-amber-900">需要你的决策</span>
            </div>
            <p className="text-[12px] text-amber-800 leading-relaxed">{run.question}</p>
            <div className="flex gap-1.5">
              <Input
                className="flex-1 text-[12px] !h-8"
                placeholder="输入回复后回车发送..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReply() }}
              />
              <Button size="sm" onClick={handleReply} className="!h-8 !text-[12px]">回复</Button>
            </div>
          </div>
        )}

        {/* Completed PRs */}
        {run.status === 'completed' && (
          <div className="flex flex-wrap gap-1.5">
            {run.pr && (
              <Badge variant="outline" className="font-mono text-[10px] text-green-700 border-green-500">
                {run.pr}
              </Badge>
            )}
            {run.distillPrs?.map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-[10px] text-purple-700 border-purple-500">
                {p} 待 merge
              </Badge>
            ))}
          </div>
        )}

        {/* Error */}
        {run.status === 'failed' && run.error && (
          <div className="text-[12px] text-destructive bg-red-50 border-2 border-destructive p-2">
            {run.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          {run.status === 'running' && (
            <>
              <Button variant="outline" size="sm" onClick={handlePause}>⏸</Button>
              <Button variant="outline" size="sm" onClick={handleStop}>✕</Button>
            </>
          )}
          {run.status === 'waiting_human' && (
            <>
              <Button variant="outline" size="sm" onClick={handlePause}>⏸</Button>
              <Button variant="outline" size="sm" onClick={handleStop}>✕</Button>
            </>
          )}
          {run.status === 'paused' && (
            <>
              <Button variant="default" size="sm" onClick={handleResume}>▶ 继续</Button>
              <Button variant="outline" size="sm" onClick={handleStop}>✕</Button>
            </>
          )}
          {run.status === 'queued' && (
            <Button variant="outline" size="sm" onClick={handleStop}>取消</Button>
          )}
          {run.status === 'failed' && (
            <Button variant="default" size="sm" onClick={handleRetry}>🔄 重试</Button>
          )}
          {run.status === 'completed' && (
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'REMOVE_RUN', id: run.id })}>删除</Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClick}>详情</Button>
        </div>
      </div>
    </div>
  )
}

function formatToken(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
