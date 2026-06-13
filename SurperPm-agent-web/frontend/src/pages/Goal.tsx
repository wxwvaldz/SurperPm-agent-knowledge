import { useState } from 'react'
import { api, GoalRun } from '@/api/client'
import { useGoalRuns } from '@/hooks/use-goal-runs'

export default function Goal() {
  const { runs, loading } = useGoalRuns()

  const running = runs.filter((r) => r.status === 'running')
  const done = runs.filter((r) => r.status === 'done' || r.status === 'failed')

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Goal 控制台</h1>

      <SubmitForm />

      {loading ? (
        <p className="text-sm text-gray-500">加载中...</p>
      ) : (
        <>
          <Section title={`运行中（${running.length}）`}>
            {running.length === 0 && <Empty text="暂无运行中的任务" />}
            {running.map((r) => (
              <RunCard key={r.id} run={r} />
            ))}
          </Section>

          <Section title={`已完成（${done.length}）`}>
            {done.length === 0 && <Empty text="暂无已完成的任务" />}
            {done.map((r) => (
              <CompletedRow key={r.id} run={r} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}

function SubmitForm() {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.goal.submit({ goal_text: text })
      setText('')
    } catch {
      // errors handled by global 401; other errors silently fail for MVP
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-sm font-semibold mb-4">+ 新建执行</h2>
      <div className="space-y-4">
        <Row label="目标描述">
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="描述你希望 Agent 完成的任务..."
          />
        </Row>
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm disabled:opacity-50"
          >
            {submitting ? '提交中…' : '▶ 启动'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{text}</p>
}

function RunCard({ run }: { run: GoalRun }) {
  const elapsed = run.started_at
    ? `${Math.round((Date.now() - new Date(run.started_at).getTime()) / 60000)}min`
    : ''

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs text-gray-500">#{run.id.slice(0, 6)}</span>
        <span className="font-medium truncate flex-1">{run.goal_text}</span>
        <span className="ml-auto px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
          ▶ 运行中
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>{run.logs.length} logs</span>
        <span>${run.cost_usd.toFixed(3)}</span>
        {elapsed && <span>{elapsed}</span>}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => api.goal.pause(run.id)}
          className="px-3 py-1 border rounded text-sm"
        >
          ⏸ 暂停
        </button>
      </div>
    </div>
  )
}

function CompletedRow({ run }: { run: GoalRun }) {
  const isFailure = run.status === 'failed'
  return (
    <div className="bg-white border rounded p-3 flex items-center gap-3 text-sm">
      <span className={isFailure ? 'text-red-600' : 'text-green-600'}>
        {isFailure ? '❌' : '✅'}
      </span>
      <span className="font-mono text-xs text-gray-500">#{run.id.slice(0, 6)}</span>
      <span className="font-medium truncate flex-1">{run.goal_text}</span>
      <span className="text-xs text-gray-500">${run.cost_usd.toFixed(3)}</span>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
