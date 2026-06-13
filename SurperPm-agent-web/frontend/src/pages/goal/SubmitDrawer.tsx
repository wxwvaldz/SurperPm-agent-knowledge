import { useState } from 'react'
import { Drawer } from '@/components/retroui/Drawer'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Textarea } from '@/components/retroui/Textarea'
import { Label } from '@/components/retroui/Label'
import { useGoalState, useGoalDispatch } from './useGoalStore'
import type { GoalRun } from './types'

const SESSIONS = [
  { id: 'add-phone-field-20260613', label: 'add-phone-field-20260613' },
  { id: 'refactor-checkout-20260613', label: 'refactor-checkout-20260613' },
  { id: 'export-csv-20260613', label: 'export-csv-20260613' },
  { id: '', label: '（不关联会话）' },
]

const CONTEXT_FILES = [
  'knowledge/profiles/team.md',
  'knowledge/profiles/xinhai.md',
  'knowledge/domain/conventions/api.md',
  'knowledge/extensions/tdd.md',
]

let nextId = 46
function genId() { return `L${String(nextId++).padStart(3, '0')}` }

export default function SubmitDrawer() {
  const { isSubmitOpen } = useGoalState()
  const dispatch = useGoalDispatch()

  const [sessionId, setSessionId] = useState('add-phone-field-20260613')
  const [description, setDescription] = useState('')
  const [maxIter, setMaxIter] = useState('50')
  const [tokenBudget, setTokenBudget] = useState('500000')
  const [maxDuration, setMaxDuration] = useState('60')
  const [sandbox, setSandbox] = useState<'lap' | 'local'>('lap')

  function handleSubmit() {
    if (!description.trim()) return
    const run: GoalRun = {
      id: genId(),
      name: sessionId ? sessionId.replace(/-\d{8}$/, '') : 'goal-' + genId(),
      sessionId,
      description: description.trim(),
      status: 'queued',
      iter: 0,
      maxIter: Number(maxIter) || 50,
      tokens: 0,
      tokenBudget: Number(tokenBudget) || 500000,
      duration: '-',
      maxDuration: Number(maxDuration) || 60,
      sandbox,
      createdAt: new Date().toISOString(),
      activity: '等待可用 pod...',
    }
    dispatch({ type: 'SUBMIT_RUN', run })
    setDescription('')
  }

  const canSubmit = description.trim().length > 0

  return (
    <Drawer
      open={isSubmitOpen}
      onOpenChange={(open) => { if (!open) dispatch({ type: 'TOGGLE_SUBMIT' }) }}
    >
      <Drawer.Content data-side="right">
        <Drawer.Header className="border-b-2 pb-4">
          <Drawer.Title className="font-head">新建执行</Drawer.Title>
          <Drawer.Description className="text-[12px]">
            提交 Goal 到队列，Agent 将自动领取并执行
          </Drawer.Description>
        </Drawer.Header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Session selection */}
          <div>
            <Label className="mb-1.5 block text-sm font-head">关联 Session</Label>
            <select
              className="w-full border-2 border-border shadow-md bg-input px-3 py-2 text-sm"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              {SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Session 的 conversation / notes / decisions 将作为上下文注入
            </p>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1.5 block text-sm font-head">目标描述</Label>
            <Textarea
              rows={4}
              placeholder="描述要让 AI 完成什么任务..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
          </div>

          {/* Parameters */}
          <fieldset className="border-2 p-3 space-y-3">
            <legend className="text-sm font-head font-semibold px-1">执行参数</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">最大迭代</Label>
                <Input value={maxIter} onChange={(e) => setMaxIter(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Token 预算</Label>
                <Input value={tokenBudget} onChange={(e) => setTokenBudget(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">最大时长（分钟）</Label>
                <Input value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">沙箱</Label>
                <select
                  className="w-full border-2 border-border shadow-md bg-input px-3 py-2 text-sm"
                  value={sandbox}
                  onChange={(e) => setSandbox(e.target.value as 'lap' | 'local')}
                >
                  <option value="lap">LAP pod</option>
                  <option value="local">本地 worktree</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Context preview */}
          <div>
            <Label className="mb-1.5 block text-sm font-head">上下文注入预览</Label>
            <div className="border-2 p-3 bg-gray-50 space-y-1 max-h-32 overflow-y-auto">
              {CONTEXT_FILES.map((f) => (
                <div key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                  <span className="text-primary font-bold">●</span> {f}
                </div>
              ))}
              {sessionId && (
                <div className="text-[11px] font-mono flex items-center gap-2 border-t-2 pt-1 mt-1">
                  <span className="text-accent-foreground font-bold">◆</span>
                  <span className="text-muted-foreground">sessions/{sessionId}/</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Drawer.Footer className="border-t-2 pt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'TOGGLE_SUBMIT' })}>
            取消
          </Button>
          <Button className="flex-1" disabled={!canSubmit} onClick={handleSubmit}>
            提交到队列
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
