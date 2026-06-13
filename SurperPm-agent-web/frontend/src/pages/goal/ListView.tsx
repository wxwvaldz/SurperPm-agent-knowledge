import { Accordion } from '@/components/retroui/Accordion'
import { Badge } from '@/components/retroui/Badge'
import { useGoalState, useGoalDispatch } from './useGoalStore'
import { BOARD_COLUMNS } from './types'
import RunCard from './RunCard'

export default function ListView() {
  const { runs } = useGoalState()
  const dispatch = useGoalDispatch()

  function handleCardClick(runId: string) {
    dispatch({ type: 'SELECT_RUN', id: runId })
  }

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {BOARD_COLUMNS.map((col) => {
        const items = runs.filter((r) => r.status === col.status)
        if (items.length === 0) return null

        return (
          <Accordion key={col.status} defaultValue={[col.status]}>
            <Accordion.Item value={col.status}>
              <Accordion.Header>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-head font-semibold">{col.label}</span>
                  <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                    {items.length}
                  </Badge>
                </div>
              </Accordion.Header>
              <Accordion.Content>
                <div className="space-y-2.5">
                  {items.map((run) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      onClick={() => handleCardClick(run.id)}
                    />
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        )
      })}
    </div>
  )
}
