import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type {
  AuditEvent,
  CommentEntry,
  CommentThread,
  ExtractorRun,
  Field,
  PhaseId,
  Report,
  Toast,
} from '../types'
import { seedReports } from '../data/reports'
import { CURRENT_USER_ID } from '../data/reference'
import { setPath, uid } from '../lib/util'

const STORAGE_KEY = 'soc1-analyzer/v1'

interface State {
  reports: Report[]
  currentUserId: string
  toasts: Toast[]
}

function initialState(): State {
  return { reports: seedReports(), currentUserId: CURRENT_USER_ID, toasts: [] }
}

type Action =
  | { type: 'reset' }
  | { type: 'set_current_user'; userId: string }
  | { type: 'create_report'; report: Report }
  | { type: 'delete_report'; id: string }
  | { type: 'patch_report'; id: string; patch: Partial<Report>; touch?: boolean }
  | { type: 'set_extractors'; id: string; extractors: ExtractorRun[] }
  | { type: 'set_field'; id: string; path: string; value: unknown; userId: string }
  | { type: 'confirm_field'; id: string; path: string; userId: string }
  | { type: 'verify'; id: string; phase: PhaseId; userId: string }
  | { type: 'unverify'; id: string; phase: PhaseId }
  | { type: 'add_thread'; id: string; thread: CommentThread }
  | { type: 'add_entry'; id: string; threadId: string; entry: CommentEntry }
  | { type: 'resolve_thread'; id: string; threadId: string; resolved: boolean; userId: string }
  | { type: 'audit'; id: string; event: AuditEvent }
  | { type: 'toast'; toast: Toast }
  | { type: 'dismiss_toast'; toastId: string }

function mapReport(state: State, id: string, fn: (r: Report) => Report): State {
  return { ...state, reports: state.reports.map((r) => (r.id === id ? fn(r) : r)) }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return initialState()

    case 'set_current_user':
      return { ...state, currentUserId: action.userId }

    case 'create_report':
      return { ...state, reports: [action.report, ...state.reports] }

    case 'delete_report':
      return { ...state, reports: state.reports.filter((r) => r.id !== action.id) }

    case 'patch_report':
      return mapReport(state, action.id, (r) => ({
        ...r,
        ...action.patch,
        updatedAt: action.touch === false ? r.updatedAt : new Date().toISOString(),
      }))

    case 'set_extractors':
      return mapReport(state, action.id, (r) => ({ ...r, extractors: action.extractors }))

    case 'set_field':
      return mapReport(state, action.id, (r) => {
        if (!r.data) return r
        let data = setPath(r.data, `${action.path}.value`, action.value)
        data = setPath(data, `${action.path}.edited`, true)
        data = setPath(data, `${action.path}.editedBy`, action.userId)
        data = setPath(data, `${action.path}.editedAt`, new Date().toISOString())
        // A reviewer typing over a suggestion is itself a confirmation of the value.
        data = setPath(data, `${action.path}.confirmed`, true)
        data = setPath(data, `${action.path}.confirmedBy`, action.userId)
        return { ...r, data, updatedAt: new Date().toISOString() }
      })

    case 'confirm_field':
      return mapReport(state, action.id, (r) => {
        if (!r.data) return r
        let data = setPath(r.data, `${action.path}.confirmed`, true)
        data = setPath(data, `${action.path}.confirmedBy`, action.userId)
        return { ...r, data, updatedAt: new Date().toISOString() }
      })

    case 'verify':
      return mapReport(state, action.id, (r) => ({
        ...r,
        verifications: {
          ...r.verifications,
          [action.phase]: { userId: action.userId, at: new Date().toISOString() },
        },
        updatedAt: new Date().toISOString(),
      }))

    case 'unverify':
      return mapReport(state, action.id, (r) => {
        const next = { ...r.verifications }
        delete next[action.phase]
        return { ...r, verifications: next, updatedAt: new Date().toISOString() }
      })

    case 'add_thread':
      return mapReport(state, action.id, (r) => ({
        ...r,
        comments: [...r.comments, action.thread],
        updatedAt: new Date().toISOString(),
      }))

    case 'add_entry':
      return mapReport(state, action.id, (r) => ({
        ...r,
        comments: r.comments.map((t) =>
          t.id === action.threadId ? { ...t, entries: [...t.entries, action.entry] } : t,
        ),
        updatedAt: new Date().toISOString(),
      }))

    case 'resolve_thread':
      return mapReport(state, action.id, (r) => ({
        ...r,
        comments: r.comments.map((t) =>
          t.id === action.threadId
            ? {
                ...t,
                resolved: action.resolved,
                resolvedBy: action.resolved ? action.userId : undefined,
                resolvedAt: action.resolved ? new Date().toISOString() : undefined,
              }
            : t,
        ),
        updatedAt: new Date().toISOString(),
      }))

    case 'audit':
      return mapReport(state, action.id, (r) => ({ ...r, audit: [...r.audit, action.event] }))

    case 'toast':
      return { ...state, toasts: [...state.toasts, action.toast] }

    case 'dismiss_toast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }

    default:
      return state
  }
}

function loadPersisted(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<State>
    if (!parsed.reports?.length) return initialState()
    return { reports: parsed.reports, currentUserId: parsed.currentUserId ?? CURRENT_USER_ID, toasts: [] }
  } catch {
    // A stale or malformed payload should never block the mock from loading.
    return initialState()
  }
}

interface StoreValue {
  state: State
  dispatch: React.Dispatch<Action>
  reportById: (id: string | undefined) => Report | undefined
  toast: (kind: Toast['kind'], title: string, body?: string) => void
  logAudit: (reportId: string, summary: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersisted)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ reports: state.reports, currentUserId: state.currentUserId }),
      )
    } catch {
      // Storage can be unavailable (private mode); the mock still works in-memory.
    }
  }, [state.reports, state.currentUserId])

  const reportById = useCallback(
    (id: string | undefined) => state.reports.find((r) => r.id === id),
    [state.reports],
  )

  const toast = useCallback((kind: Toast['kind'], title: string, body?: string) => {
    dispatch({ type: 'toast', toast: { id: uid('toast'), kind, title, body } })
  }, [])

  const logAudit = useCallback(
    (reportId: string, summary: string) => {
      dispatch({
        type: 'audit',
        id: reportId,
        event: { id: uid('audit'), at: new Date().toISOString(), userId: state.currentUserId, summary },
      })
    },
    [state.currentUserId],
  )

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, reportById, toast, logAudit }),
    [state, reportById, toast, logAudit],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/* ----------------------------- derived helpers ---------------------------- */

/** A field needs explicit human confirmation before the section can be signed off. */
export function needsConfirmation(field: Field<unknown> | undefined): boolean {
  if (!field) return false
  if (field.confirmed) return false
  return field.origin === 'ai_recommendation' || field.origin === 'rolled_forward'
}

export function isApprover(role: string | undefined): boolean {
  return role === 'Approver'
}

export function canVerify(role: string | undefined): boolean {
  return role === 'Approver' || role === 'Reviewer'
}
