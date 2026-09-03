import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/store'
import { users } from '../data/reference'
import { Avatar, Badge, Button, CheckIcon, CloseIcon, InfoIcon, SlackIcon, AlertIcon } from './ui'
import { classNames as cx } from '../lib/util'

const navItems = [
  { to: '/extract', label: 'Extract Report' },
  { to: '/history', label: 'Extraction History' },
  { to: '/guide', label: 'User Guide' },
]

export default function Layout() {
  const { state, dispatch } = useStore()
  const location = useLocation()
  const currentUser = users.find((u) => u.id === state.currentUserId)
  const [userMenu, setUserMenu] = useState(false)

  useEffect(() => setUserMenu(false), [location.pathname])

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="flex h-14 items-center gap-6 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-600 text-[12px] font-bold text-white">
              S1
            </div>
            <div className="leading-tight">
              <div className="text-[13.5px] font-semibold text-ink-900">SOC 1 Report Analyzer</div>
              <div className="text-[11px] text-ink-500">Third-Party Risk · Internal Controls</div>
            </div>
          </div>

          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Badge tone="amber" title="This build uses simulated data and timers — no documents leave the browser.">
              Mock environment
            </Badge>
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-ink-100"
                onClick={() => setUserMenu((v) => !v)}
                aria-expanded={userMenu}
              >
                <Avatar user={currentUser} size={26} />
                <span className="text-left leading-tight">
                  <span className="block text-[12.5px] font-medium text-ink-800">{currentUser?.name}</span>
                  <span className="block text-[11px] text-ink-500">{currentUser?.role}</span>
                </span>
              </button>
              {userMenu && (
                <div className="animate-fade-rise absolute right-0 z-40 mt-1 w-72 rounded-md border border-ink-200 bg-white py-1 shadow-lg">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Sign in as (demo)
                  </p>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      className={cx(
                        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-ink-50',
                        u.id === state.currentUserId && 'bg-brand-50',
                      )}
                      onClick={() => dispatch({ type: 'set_current_user', userId: u.id })}
                    >
                      <Avatar user={u} size={22} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-ink-800">{u.name}</span>
                        <span className="block text-[11px] text-ink-500">{u.role}</span>
                      </span>
                      {u.id === state.currentUserId && <CheckIcon className="h-4 w-4 text-brand-600" />}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-ink-100 px-3 py-2">
                    <p className="mb-1.5 text-[11.5px] text-ink-500">
                      Role changes which actions are permitted — read-only users cannot verify or approve.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        dispatch({ type: 'reset' })
                        setUserMenu(false)
                      }}
                    >
                      Reset demo data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <ToastStack />
    </div>
  )
}

function ToastStack() {
  const { state, dispatch } = useStore()

  useEffect(() => {
    if (state.toasts.length === 0) return
    const timers = state.toasts.map((t) =>
      setTimeout(() => dispatch({ type: 'dismiss_toast', toastId: t.id }), t.kind === 'error' ? 9000 : 6000),
    )
    return () => timers.forEach(clearTimeout)
  }, [state.toasts, dispatch])

  if (state.toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[380px] flex-col gap-2">
      {state.toasts.map((t) => {
        const tone =
          t.kind === 'error'
            ? 'border-red-300 bg-white'
            : t.kind === 'success'
              ? 'border-emerald-300 bg-white'
              : t.kind === 'slack'
                ? 'border-ink-300 bg-white'
                : 'border-ink-200 bg-white'
        const icon =
          t.kind === 'error' ? (
            <AlertIcon className="h-4 w-4 text-red-600" />
          ) : t.kind === 'success' ? (
            <CheckIcon className="h-4 w-4 text-emerald-600" />
          ) : t.kind === 'slack' ? (
            <SlackIcon className="h-4 w-4 text-ink-700" />
          ) : (
            <InfoIcon className="h-4 w-4 text-sky-600" />
          )
        return (
          <div key={t.id} className={cx('animate-fade-rise flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg', tone)}>
            <span className="mt-[1px]">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">
                {t.kind === 'slack' && <span className="mr-1.5 text-ink-400">Slack ·</span>}
                {t.title}
              </p>
              {t.body && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-600">{t.body}</p>}
            </div>
            <button
              className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              onClick={() => dispatch({ type: 'dismiss_toast', toastId: t.id })}
              aria-label="Dismiss"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
