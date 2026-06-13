import { useGoalState, useGoalDispatch } from './useGoalStore'
import { BOARD_COLUMNS } from './types'
import type { GoalStatus } from './types'
import RunCard from './RunCard'

const COLUMN_BG: Record<GoalStatus, string> = {
  queued: 'bg-gray-100',
  running: 'bg-blue-50',
  waiting_human: 'bg-amber-50',
  paused: 'bg-gray-100',
  completed: 'bg-green-50',
  failed: 'bg-red-50',
  cancelled: 'bg-gray-100',
}

export default function BoardView() {
  const { runs } = useGoalState()
  const dispatch = useGoalDispatch()

  const runsByStatus = (status: GoalStatus) => runs.filter((r) => r.status === status)

  function handleCardClick(runId: string) {
    dispatch({ type: 'SELECT_RUN', id: runId })
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 h-full items-start">
      {BOARD_COLUMNS.map((col) => {
        const items = runsByStatus(col.status)
        return (
          <div
            key={col.status}
            className="flex-1 min-w-[250px] max-w-[380px] flex flex-col"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-2.5 px-1 flex-shrink-0">
              <h3 className="text-[12px] font-head font-semibold uppercase tracking-wider text-muted-foreground">
                {col.label}
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground border-2 px-1.5 py-px">
                {items.length}
              </span>
            </div>

            {/* Column body */}
            <div className={`flex-1 space-y-2 p-2 min-h-[120px] ${COLUMN_BG[col.status]}`}>
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-[11px] text-gray-300 font-mono select-none">
                  —
                </div>
              ) : (
                items.map((run) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    onClick={() => handleCardClick(run.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
