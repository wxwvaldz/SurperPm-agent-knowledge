import { GoalProvider, useGoalState, useGoalDispatch } from './goal/useGoalStore'
import { Button } from '@/components/retroui/Button'
import SubmitDrawer from './goal/SubmitDrawer'
import BoardView from './goal/BoardView'
import ListView from './goal/ListView'
import RunDetailDrawer from './goal/RunDetailDrawer'

export default function Goal() {
  return (
    <GoalProvider>
      <GoalPage />
    </GoalProvider>
  )
}

function GoalPage() {
  const { viewMode, runs } = useGoalState()
  const dispatch = useGoalDispatch()

  const hasRuns = runs.length > 0
  const activeCount = runs.filter(
    (r) => r.status === 'running' || r.status === 'waiting_human',
  ).length

  return (
    <div className="h-full flex flex-col pt-4 sm:pt-6 px-4 sm:px-6 pb-0">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 shrink-0">
        <div className="flex items-baseline gap-3">
          <h2 className="font-head font-bold text-xl">Goal 控制台</h2>
          {hasRuns && (
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {runs.length} 个执行
              {activeCount > 0 && (
                <span className="text-amber-600 ml-1 font-semibold">
                  {activeCount} 活跃
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle — Linear-style segmented control */}
          {hasRuns && (
            <div className="border-2 flex mr-1">
              <button
                className={`px-3 py-1 text-[12px] font-head font-semibold transition-colors ${
                  viewMode === 'board'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'board' })}
              >
                看板
              </button>
              <button
                className={`px-3 py-1 text-[12px] font-head font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'list' })}
              >
                列表
              </button>
            </div>
          )}
          <Button onClick={() => dispatch({ type: 'TOGGLE_SUBMIT' })}>
            + 新建执行
          </Button>
        </div>
      </div>

      {/* Content area — fills remaining height */}
      <div className="flex-1 min-h-0">
        {!hasRuns ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="border-2 p-4">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-head font-semibold">还没有执行记录</p>
              <p className="text-gray-400 text-[12px] mt-0.5">
                提交第一个 Goal，让 AI Agent 开始工作
              </p>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <BoardView />
        ) : (
          <ListView />
        )}
      </div>

      <SubmitDrawer />
      <RunDetailDrawer />
    </div>
  )
}
