import { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { GoalRun, GoalStatus } from './types'
import { MOCK_RUNS, VALID_TRANSITIONS } from './types'

type ViewMode = 'board' | 'list'

interface GoalState {
  runs: GoalRun[]
  viewMode: ViewMode
  selectedRunId: string | null
  isSubmitOpen: boolean
}

type GoalAction =
  | { type: 'SUBMIT_RUN'; run: GoalRun }
  | { type: 'UPDATE_STATUS'; id: string; status: GoalStatus }
  | { type: 'UPDATE_PROGRESS'; id: string; iter: number; tokens: number; duration: string; activity: string }
  | { type: 'REMOVE_RUN'; id: string }
  | { type: 'REPLY_RUN'; id: string; reply: string }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SELECT_RUN'; id: string | null }
  | { type: 'TOGGLE_SUBMIT' }

function goalReducer(state: GoalState, action: GoalAction): GoalState {
  switch (action.type) {
    case 'SUBMIT_RUN':
      return { ...state, runs: [action.run, ...state.runs], isSubmitOpen: false }

    case 'UPDATE_STATUS': {
      const run = state.runs.find((r) => r.id === action.id)
      if (!run) return state
      if (!VALID_TRANSITIONS[run.status].includes(action.status)) return state
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id ? { ...r, status: action.status, activity: statusActivity(action.status) } : r,
        ),
      }
    }

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id
            ? { ...r, iter: action.iter, tokens: action.tokens, duration: action.duration, activity: action.activity }
            : r,
        ),
      }

    case 'REMOVE_RUN':
      return { ...state, runs: state.runs.filter((r) => r.id !== action.id) }

    case 'REPLY_RUN':
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id
            ? { ...r, status: 'running' as GoalStatus, question: undefined, activity: '收到回复，继续执行...' }
            : r,
        ),
      }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode }

    case 'SELECT_RUN':
      return { ...state, selectedRunId: action.id }

    case 'TOGGLE_SUBMIT':
      return { ...state, isSubmitOpen: !state.isSubmitOpen }

    default:
      return state
  }
}

function statusActivity(status: GoalStatus): string {
  const map: Record<GoalStatus, string> = {
    queued: '等待可用 pod...',
    running: '开始执行...',
    waiting_human: '等待 PM 回复...',
    paused: '已暂停',
    completed: '执行成功',
    failed: '执行失败',
    cancelled: '已取消',
  }
  return map[status]
}

const initial: GoalState = {
  runs: MOCK_RUNS,
  viewMode: 'board',
  selectedRunId: null,
  isSubmitOpen: false,
}

const GoalContext = createContext<GoalState | null>(null)
const DispatchContext = createContext<Dispatch<GoalAction> | null>(null)

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(goalReducer, initial)
  return (
    <GoalContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </GoalContext.Provider>
  )
}

export function useGoalState() {
  const ctx = useContext(GoalContext)
  if (!ctx) throw new Error('useGoalState must be inside GoalProvider')
  return ctx
}

export function useGoalDispatch() {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useGoalDispatch must be inside GoalProvider')
  return ctx
}

export function getRunById(runs: GoalRun[], id: string | null): GoalRun | undefined {
  if (!id) return undefined
  return runs.find((r) => r.id === id)
}
