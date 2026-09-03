import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { classNames as cx, matches } from '../lib/util'
import type { ExtractionStatus, FieldOrigin, ReviewStatus, User } from '../types'

/* --------------------------------- button -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize = 'sm' | 'md'

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border border-brand-700',
  secondary: 'bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-100 border border-transparent',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
  subtle: 'bg-ink-100 text-ink-700 border border-transparent hover:bg-ink-200',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'text-[12px] px-2 py-1',
  md: 'text-[13px] px-3 py-1.5',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />
}

/* -------------------------------- surfaces -------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-lg border border-ink-200 bg-white', className)}>{children}</div>
  )
}

export function SectionHeading({
  title,
  hint,
  right,
}: {
  title: ReactNode
  hint?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {hint && <p className="mt-0.5 max-w-2xl text-[12.5px] text-ink-500">{hint}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* --------------------------------- badges --------------------------------- */

export function Badge({
  tone = 'neutral',
  className,
  children,
  title,
}: {
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'indigo'
  className?: string
  children: ReactNode
  title?: string
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600 border-ink-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    violet: 'bg-ai-50 text-ai-700 border-ai-200',
    indigo: 'bg-brand-50 text-brand-700 border-brand-200',
  }
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export const extractionStatusMeta: Record<ExtractionStatus, { label: string; tone: 'neutral' | 'blue' | 'green' | 'amber' | 'red' }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  processing: { label: 'Processing', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  partial: { label: 'Partial', tone: 'amber' },
  failed: { label: 'Extraction failed', tone: 'red' },
}

export const reviewStatusMeta: Record<ReviewStatus, { label: string; tone: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'indigo' }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  ready_for_review: { label: 'Ready for review', tone: 'blue' },
  in_review: { label: 'In review', tone: 'indigo' },
  pending_approval: { label: 'Pending approval', tone: 'blue' },
  changes_requested: { label: 'Changes requested', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
}

export function ExtractionStatusBadge({ status }: { status: ExtractionStatus }) {
  const m = extractionStatusMeta[status]
  return (
    <Badge tone={m.tone}>
      {status === 'processing' && <Spinner className="h-2.5 w-2.5" />}
      {m.label}
    </Badge>
  )
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const m = reviewStatusMeta[status]
  return <Badge tone={m.tone}>{m.label}</Badge>
}

/** Where a value came from. Keeps AI output visually distinct from confirmed input. */
export function OriginBadge({
  origin,
  edited,
  confirmed,
}: {
  origin: FieldOrigin
  edited?: boolean
  confirmed?: boolean
}) {
  if (edited) {
    return (
      <Badge tone="indigo" title="A reviewer changed the extracted value">
        <PencilIcon className="h-3 w-3" /> Reviewer edited
      </Badge>
    )
  }
  switch (origin) {
    case 'ai':
      return (
        <Badge tone="violet" title="Extracted from the PDF by a model">
          <SparkIcon className="h-3 w-3" /> AI extracted
        </Badge>
      )
    case 'ai_recommendation':
      return confirmed ? (
        <Badge tone="green" title="Suggestion confirmed by a reviewer">
          <CheckIcon className="h-3 w-3" /> Confirmed suggestion
        </Badge>
      ) : (
        <Badge tone="violet" className="border-dashed" title="Suggested from prior reviews — needs confirmation">
          <SparkIcon className="h-3 w-3" /> Suggested · needs confirmation
        </Badge>
      )
    case 'rolled_forward':
      return confirmed ? (
        <Badge tone="green" title="Prior-year value reconfirmed for this period">
          <CheckIcon className="h-3 w-3" /> Reconfirmed
        </Badge>
      ) : (
        <Badge tone="amber" title="Carried over from the prior-year report — needs reconfirmation">
          <RollIcon className="h-3 w-3" /> Rolled forward · reconfirm
        </Badge>
      )
    default:
      return (
        <Badge tone="neutral" title="Entered by a reviewer">
          Manual entry
        </Badge>
      )
  }
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const tone = pct >= 92 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500'
  const label = pct >= 92 ? 'High' : pct >= 80 ? 'Medium' : 'Low'
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label} match confidence`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-ink-200">
        <span className={cx('block h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="tnum text-[11px] text-ink-500">{pct}%</span>
    </span>
  )
}

/* --------------------------------- avatars -------------------------------- */

const avatarTones = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-700',
  'bg-ai-100 text-ai-700',
  'bg-rose-100 text-rose-700',
]

export function Avatar({ user, size = 22 }: { user: User | undefined; size?: number }) {
  if (!user) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-ink-200 text-ink-500"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        ?
      </span>
    )
  }
  const tone = avatarTones[user.id.charCodeAt(user.id.length - 1) % avatarTones.length]
  return (
    <span
      title={`${user.name} · ${user.role}`}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', tone)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {user.initials}
    </span>
  )
}

export function UserChip({ user }: { user: User | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar user={user} size={18} />
      <span className="text-[12.5px] text-ink-700">{user?.name ?? 'Unassigned'}</span>
    </span>
  )
}

/* --------------------------------- inputs --------------------------------- */

const fieldBase =
  'w-full rounded-md border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] text-ink-800 ' +
  'placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ' +
  'disabled:bg-ink-50 disabled:text-ink-500'

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input className={cx(fieldBase, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea className={cx(fieldBase, 'resize-y leading-relaxed', className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; ref?: React.Ref<HTMLSelectElement> }) {
  return (
    <select className={cx(fieldBase, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-medium text-ink-700">
      {children}
      {hint && <span className="ml-1.5 font-normal text-ink-400">{hint}</span>}
    </label>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1 flex items-start gap-1 text-[12px] text-red-700">
      <AlertIcon className="mt-[1px] h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/* -------------------------------- typeahead ------------------------------- */

export interface TypeaheadOption {
  value: string
  label: string
  hint?: string
}

export function Typeahead({
  options,
  value,
  onChange,
  placeholder,
  id,
  disabled,
  allowCustom = true,
  emptyHint = 'No matches',
}: {
  options: TypeaheadOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  allowCustom?: boolean
  emptyHint?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => setQuery(value), [value])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q || q === value) return options.slice(0, 8)
    return options.filter((o) => matches(o.label, q) || matches(o.hint ?? '', q)).slice(0, 8)
  }, [options, query, value])

  function commit(option: TypeaheadOption) {
    onChange(option.value)
    setQuery(option.value)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        className={cx(fieldBase)}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
          if (allowCustom) onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, filtered.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && filtered[active]) {
            e.preventDefault()
            commit(filtered[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-ink-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 && <li className="px-2.5 py-2 text-[12.5px] text-ink-400">{emptyHint}</li>}
          {filtered.map((o, i) => (
            <li key={o.value} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={cx(
                  'block w-full px-2.5 py-1.5 text-left',
                  i === active ? 'bg-brand-50' : 'hover:bg-ink-50',
                )}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o)}
              >
                <span className="block text-[13px] text-ink-800">{o.label}</span>
                {o.hint && <span className="block text-[11.5px] text-ink-500">{o.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------------------------------- modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-6 pt-[8vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('animate-fade-rise w-full rounded-lg border border-ink-200 bg-white shadow-xl', width)}
      >
        <div className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-[12.5px] text-ink-500">{description}</p>}
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && <div className="flex justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* --------------------------------- drawer --------------------------------- */

/** Right-hand slide-over sheet. Same escape/overlay behaviour as Modal. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  icon,
  titleAccessory,
  toolbar,
  children,
  footer,
  width = 'max-w-[30rem]',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  icon?: ReactNode
  titleAccessory?: ReactNode
  toolbar?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/30" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx(
          'animate-slide-in-right flex h-full w-full flex-col border-l border-ink-200 bg-white shadow-2xl',
          width,
        )}
      >
        <div className="flex shrink-0 items-start gap-2 border-b border-ink-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
                {icon}
                {title}
              </h2>
              {titleAccessory}
            </div>
            {description && <p className="mt-0.5 text-[12px] text-ink-500">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" title="Close">
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>
        {toolbar && <div className="shrink-0 border-b border-ink-100 bg-ink-50 px-3 py-2">{toolbar}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-200 bg-ink-50 px-4 py-3">{footer}</div>}
      </aside>
    </div>
  )
}

/* -------------------------------- feedback -------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className ?? 'h-4 w-4')} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'red' | 'amber' }) {
  const tones = { brand: 'bg-brand-600', green: 'bg-emerald-600', red: 'bg-red-500', amber: 'bg-amber-500' }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200" role="progressbar" aria-valuenow={Math.round(value)}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', tones[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success' | 'ai'
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-300 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    ai: 'border-ai-200 bg-ai-50 text-ai-700',
  }
  const icons = {
    info: <InfoIcon className="h-4 w-4" />,
    warning: <AlertIcon className="h-4 w-4" />,
    error: <AlertIcon className="h-4 w-4" />,
    success: <CheckIcon className="h-4 w-4" />,
    ai: <SparkIcon className="h-4 w-4" />,
  }
  return (
    <div className={cx('flex items-start gap-2.5 rounded-md border px-3 py-2.5', tones[tone])}>
      <span className="mt-[1px] shrink-0">{icons[tone]}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children && <div className="text-[12.5px] leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        {icon ?? <DocIcon className="h-5 w-5" />}
      </div>
      <p className="text-[14px] font-semibold text-ink-800">{title}</p>
      {body && <p className="mt-1 max-w-md text-[12.5px] text-ink-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-t border-ink-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 animate-pulse rounded bg-ink-100" style={{ width: `${45 + ((i * 17) % 45)}%` }} />
        </td>
      ))}
    </tr>
  )
}

/* --------------------------------- icons ---------------------------------- */
/* Inline so the mock ships with no icon dependency. */

type IconProps = { className?: string }
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const CheckIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" {...stroke} /></svg>
)
export const AlertIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5l7 12.5H3l7-12.5z" {...stroke} /><path d="M10 8.2v3.4M10 13.9v.1" {...stroke} /></svg>
)
export const InfoIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" {...stroke} /><path d="M10 9.2v4.2M10 6.6v.1" {...stroke} /></svg>
)
export const SparkIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6l1.7 4.4 4.4 1.7-4.4 1.7L10 14.8 8.3 10.4 3.9 8.7l4.4-1.7L10 2.6z" {...stroke} /><path d="M15.6 13.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" {...stroke} /></svg>
)
export const PencilIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M13.4 3.6l3 3L7.6 15.4l-3.9.9.9-3.9 8.8-8.8z" {...stroke} /></svg>
)
export const RollIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 10a6.5 6.5 0 1 1-2-4.7" {...stroke} /><path d="M16.8 3.6v3.2h-3.2" {...stroke} /></svg>
)
export const DocIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.8h6l4 4v10.4H5V2.8z" {...stroke} /><path d="M11 2.8v4h4" {...stroke} /></svg>
)
export const SearchIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.4" {...stroke} /><path d="M13 13l4 4" {...stroke} /></svg>
)
export const ChevronIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5l6 5.5-6 5.5" {...stroke} /></svg>
)
export const CloseIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" {...stroke} /></svg>
)
export const PanelIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><rect x="2.8" y="3.8" width="14.4" height="12.4" rx="1.6" {...stroke} /><path d="M11.6 3.8v12.4" {...stroke} /></svg>
)
export const CommentIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M17 11.2c0 2.2-2.4 4-5.4 4-.8 0-1.5-.1-2.2-.3L5 16.5l1.1-2.7C4.5 12.9 3.6 11.6 3.6 10c0-2.2 3-4.6 6.7-4.6S17 8.9 17 11.2z" {...stroke} /></svg>
)
export const UploadIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13.5V3.8M6.4 7.4L10 3.8l3.6 3.6" {...stroke} /><path d="M3.6 12.8v2.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6v-2.4" {...stroke} /></svg>
)
export const SlackIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><rect x="8.4" y="2.6" width="3.2" height="8" rx="1.6" {...stroke} /><rect x="8.4" y="9.4" width="3.2" height="8" rx="1.6" {...stroke} /><rect x="2.6" y="8.4" width="8" height="3.2" rx="1.6" {...stroke} /><rect x="9.4" y="8.4" width="8" height="3.2" rx="1.6" {...stroke} /></svg>
)
export const SheetIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><rect x="3.4" y="3.4" width="13.2" height="13.2" rx="1.6" {...stroke} /><path d="M3.4 8.2h13.2M3.4 12.4h13.2M8.6 3.4v13.2" {...stroke} /></svg>
)
export const EyeIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M1.8 10S4.9 4.9 10 4.9 18.2 10 18.2 10 15.1 15.1 10 15.1 1.8 10 1.8 10z" {...stroke} /><circle cx="10" cy="10" r="2.3" {...stroke} /></svg>
)
export const LockIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><rect x="4.4" y="8.6" width="11.2" height="8" rx="1.6" {...stroke} /><path d="M6.9 8.6V6.4a3.1 3.1 0 0 1 6.2 0v2.2" {...stroke} /></svg>
)
export const PlusIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.6v10.8M4.6 10h10.8" {...stroke} /></svg>
)
export const TargetIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.6" {...stroke} /><circle cx="10" cy="10" r="2.6" {...stroke} /><path d="M10 1.6v2.4M10 16v2.4M1.6 10h2.4M16 10h2.4" {...stroke} /></svg>
)
