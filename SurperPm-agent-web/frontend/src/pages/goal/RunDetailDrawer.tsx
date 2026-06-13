import { Drawer } from '@/components/retroui/Drawer'
import { Badge } from '@/components/retroui/Badge'
import { Button } from '@/components/retroui/Button'
import { Progress } from '@/components/retroui/Progress'
import { useGoalState, useGoalDispatch, getRunById } from './useGoalStore'
import { STATUS_LABEL } from './types'

const MOCK_LOG = [
  { iter: 1, time: '10:30:02', msg: '加载 session 上下文 (4 文件)...' },
  { iter: 2, time: '10:30:15', msg: '知识注入完成，开始分析需求...' },
  { iter: 5, time: '10:31:40', msg: '调用 find skill → 发现 add-db-field skill' },
  { iter: 8, time: '10:33:22', msg: '设计迁移文件: add_phone_to_users.rb' },
  { iter: 12, time: '10:35:10', msg: '编写 API 路由: POST /api/users/:id/phone' },
  { iter: 15, time: '10:37:45', msg: '前端表单: PhoneField.tsx' },
  { iter: 20, time: '10:40:30', msg: '运行测试: rspec spec/migrations/...' },
  { iter: 25, time: '10:45:12', msg: '测试通过 (12/12)，开始前端测试...' },
  { iter: 30, time: '10:50:05', msg: 'Vitest 单元测试全部通过' },
  { iter: 35, time: '10:52:00', msg: '正在编写 API 集成测试...' },
]

const MOCK_FILES = [
  { path: 'db/migrate/202606131030_add_phone_to_users.rb', changes: '+12 -0', type: 'migration' },
  { path: 'app/controllers/api/users_controller.rb', changes: '+25 -3', type: 'api' },
  { path: 'app/frontend/components/PhoneField.tsx', changes: '+48 -0', type: 'frontend' },
  { path: 'spec/migrations/add_phone_to_users_spec.rb', changes: '+35 -0', type: 'test' },
  { path: 'spec/requests/api/users_spec.rb', changes: '+20 -0', type: 'test' },
]

export default function RunDetailDrawer() {
  const state = useGoalState()
  const dispatch = useGoalDispatch()
  const run = getRunById(state.runs, state.selectedRunId)

  return (
    <Drawer
      open={!!state.selectedRunId}
      onOpenChange={(open) => { if (!open) dispatch({ type: 'SELECT_RUN', id: null }) }}
    >
      <Drawer.Content data-side="right" className="!w-full sm:!max-w-lg">
        {run ? (
          <>
            {/* Header */}
            <Drawer.Header className="border-b-2 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">#{run.id}</span>
                <Drawer.Title className="!text-lg font-head">{run.name}</Drawer.Title>
              </div>
              <Drawer.Description className="text-xs mt-0.5">{run.description}</Drawer.Description>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge>{STATUS_LABEL[run.status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {run.sandbox === 'lap' ? 'LAP pod' : '本地 worktree'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </Drawer.Header>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Stats grid */}
              <section>
                <h4 className="text-[11px] font-head font-semibold uppercase text-muted-foreground mb-2.5 tracking-wider">
                  执行概览
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="迭代次数" value={`${run.iter}/${run.maxIter}`} />
                  <StatBox label="Token 消耗" value={formatToken(run.tokens)} />
                  <StatBox label="已用时长" value={run.duration} />
                  <StatBox label="关联 Session" value={run.sessionId || '—'} mono />
                </div>
                {(run.status === 'running' || run.status === 'waiting_human') && (
                  <div className="mt-2.5">
                    <Progress value={Math.round((run.iter / run.maxIter) * 100)} />
                  </div>
                )}
              </section>

              {/* File changes */}
              <section>
                <h4 className="text-[11px] font-head font-semibold uppercase text-muted-foreground mb-2.5 tracking-wider">
                  文件变更 ({MOCK_FILES.length})
                </h4>
                <div className="space-y-px">
                  {MOCK_FILES.map((f) => (
                    <div
                      key={f.path}
                      className="flex items-center gap-2 text-xs py-2 px-2.5 group"
                    >
                      <span className="font-mono tabular-nums text-green-700 font-medium w-14 shrink-0 text-right text-[11px]">
                        {f.changes}
                      </span>
                      <span className="font-mono truncate text-muted-foreground text-[11px]">{f.path}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0 hidden group-hover:inline-flex">
                        {f.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>

              {/* Execution log */}
              <section>
                <h4 className="text-[11px] font-head font-semibold uppercase text-muted-foreground mb-2.5 tracking-wider">
                  执行日志
                </h4>
                <div className="border-2 bg-secondary text-green-400 font-mono text-[11px] p-3.5 max-h-64 overflow-y-auto space-y-px leading-relaxed">
                  {MOCK_LOG.map((entry, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-green-700 shrink-0 select-none">{entry.time}</span>
                      <span className="text-green-700 shrink-0 w-8 text-right select-none">#{entry.iter}</span>
                      <span className="text-green-400/90">{entry.msg}</span>
                    </div>
                  ))}
                  {run.status === 'running' && (
                    <div className="flex gap-2 items-center">
                      <span className="animate-pulse text-primary font-bold">▋</span>
                      <span className="text-green-400/70">等待下一轮迭代...</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Results */}
              {run.status === 'completed' && run.pr && (
                <section>
                  <h4 className="text-[11px] font-head font-semibold uppercase text-muted-foreground mb-2.5 tracking-wider">
                    产出物
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">●</span>
                      <span>代码 PR</span>
                      <Badge variant="outline" className="font-mono text-xs">{run.pr}</Badge>
                    </div>
                    {run.distillPrs?.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <span className="text-purple-600">◆</span>
                        <span>蒸馏 PR</span>
                        <Badge variant="outline" className="font-mono text-xs text-purple-700 border-purple-400">
                          {p}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">待 merge</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {run.status === 'failed' && run.error && (
                <section>
                  <h4 className="text-[11px] font-head font-semibold uppercase text-muted-foreground mb-2.5 tracking-wider">
                    错误信息
                  </h4>
                  <div className="border-2 border-red-200 bg-red-50 p-3 text-sm text-destructive">
                    {run.error}
                  </div>
                </section>
              )}
            </div>

            <Drawer.Footer className="border-t-2 pt-4">
              <Button variant="outline" className="w-full" onClick={() => dispatch({ type: 'SELECT_RUN', id: null })}>
                关闭
              </Button>
            </Drawer.Footer>
          </>
        ) : (
          <Drawer.Header>
            <Drawer.Title className="font-head">未选择执行</Drawer.Title>
          </Drawer.Header>
        )}
      </Drawer.Content>
    </Drawer>
  )
}

function StatBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-2 p-2.5">
      <div className={`text-sm font-semibold ${mono ? 'font-mono' : 'font-mono tabular-nums'}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

function formatToken(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
