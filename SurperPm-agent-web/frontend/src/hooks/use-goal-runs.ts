import { useEffect, useRef, useState } from 'react'
import { api, GoalRun } from '@/api/client'

export function useGoalRuns(pollInterval = 3000) {
  const [runs, setRuns] = useState<GoalRun[]>([])
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    let active = true
    const load = () => {
      api.goal.list()
        .then((data) => { if (active) setRuns(data) })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    }
    load()
    timer.current = setInterval(load, pollInterval)
    return () => { active = false; clearInterval(timer.current) }
  }, [pollInterval])

  return { runs, loading }
}
