import { useState } from 'react'

const SESSIONS = [
  { id: 'add-phone-field-20260613', label: 'add-phone-field-20260613' },
  { id: 'refactor-checkout-20260613', label: 'refactor-checkout-20260613' },
  { id: 'none', label: '（不关联会话）' },
]

const RUNS = [
  {
    id: 'L042',
    name: 'add-phone-field',
    status: 'running',
    iter: 35,
    maxIter: 50,
    tokens: 280000,
    duration: '22min',
  },
  {
    id: 'L043',
    name: 'refactor-checkout',
    status: 'waiting_human',
    iter: 12,
    maxIter: 50,
    tokens: 95000,
    question: 'redis 还是 in-memory？',
  },
  {
    id: 'L044',
    name: 'fix-issue-5',
    status: 'paused',
    iter: 12,
    maxIter: 50,
    tokens: 78000,
  },
]

const COMPLETED = [
  { id: 'L038', name: 'add-payment', pr: 'conduit#128', distillPrs: ['skill#15'] },
  { id: 'L040', name: 'fix-bug-2', failed: '超出 token 预算 (550K/500K)' },
]

export default function Goal() {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Goal 控制台</h1>

      <SubmitForm />

      <Section title={`正在跑（${RUNS.length}）`}>
        {RUNS.map((r) => (
          <RunCard key={r.id} run={r} />
        ))}
      </Section>

      <Section title="最近完成（24h）">
        {COMPLETED.map((c) => (
          <CompletedRow key={c.id} run={c} />
        ))}
      </Section>
    </div>
  )
}

function SubmitForm() {
  const [text, setText] = useState('给 user 表加 phone 字段，含迁移、API、前端表单，全部测试通过')
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-sm font-semibold mb-4">+ 新建执行</h2>
      <div className="space-y-4">
        <Row label="关联 session">
          <select className="w-full border rounded px-3 py-2 text-sm">
            {SESSIONS.map((s) => (
              <option key={s.id}>{s.label}</option>
            ))}
          </select>
        </Row>
        <Row label="目标描述">
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Row>
        <div className="grid grid-cols-2 gap-4">
          <Row label="最大迭代">
            <input className="w-full border rounded px-3 py-2 text-sm" defaultValue="50" />
          </Row>
          <Row label="Token 预算">
            <input className="w-full border rounded px-3 py-2 text-sm" defaultValue="500000" />
          </Row>
          <Row label="最大时长（分钟）">
            <input className="w-full border rounded px-3 py-2 text-sm" defaultValue="60" />
          </Row>
          <Row label="沙箱">
            <select className="w-full border rounded px-3 py-2 text-sm">
              <option>LAP pod</option>
              <option>本地 worktree</option>
            </select>
          </Row>
        </div>
        <div className="flex justify-end pt-2">
          <button className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm">
            ▶ 启动
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

function RunCard({ run }: { run: typeof RUNS[number] }) {
  const statusColor =
    run.status === 'running' ? 'bg-blue-100 text-blue-700'
    : run.status === 'waiting_human' ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-200 text-gray-700'
  const pct = Math.round((run.iter / run.maxIter) * 100)
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs text-gray-500">#{run.id}</span>
        <span className="font-medium">{run.name}</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs ${statusColor}`}>
          {run.status === 'running' && '▶ 运行中'}
          {run.status === 'waiting_human' && '❓ 等你回复'}
          {run.status === 'paused' && '⏸ 已暂停'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>{run.iter}/{run.maxIter} 迭代</span>
        <span>{(run.tokens / 1000).toFixed(0)}K tokens</span>
        {run.duration && <span>{run.duration}</span>}
      </div>
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
      </div>
      {run.question && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3">
          <div className="text-sm font-medium text-amber-900">{run.question}</div>
          <div className="flex gap-2 mt-2">
            <input className="flex-1 border rounded px-2 py-1 text-sm" placeholder="回复..." />
            <button className="px-3 py-1 bg-gray-900 text-white rounded text-sm">回复</button>
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {run.status === 'paused' ? (
          <button className="px-3 py-1 border rounded text-sm">▶ 继续</button>
        ) : (
          <button className="px-3 py-1 border rounded text-sm">⏸ 暂停</button>
        )}
        <button className="px-3 py-1 border rounded text-sm">✕ 停止</button>
        <button className="px-3 py-1 border rounded text-sm ml-auto">📋 详情</button>
      </div>
    </div>
  )
}

function CompletedRow({ run }: { run: typeof COMPLETED[number] }) {
  return (
    <div className="bg-white border rounded p-3 flex items-center gap-3 text-sm">
      <span className={run.failed ? 'text-red-600' : 'text-green-600'}>
        {run.failed ? '❌' : '✅'}
      </span>
      <span className="font-mono text-xs text-gray-500">#{run.id}</span>
      <span className="font-medium">{run.name}</span>
      {run.pr && (
        <span className="text-blue-600 font-mono text-xs">{run.pr}</span>
      )}
      {run.distillPrs && run.distillPrs.map((p) => (
        <span key={p} className="text-amber-600 font-mono text-xs">+ {p} 待 merge</span>
      ))}
      {run.failed && <span className="text-gray-500 text-xs">{run.failed}</span>}
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
