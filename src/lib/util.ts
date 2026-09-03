/* Small helpers shared across the app. */

/** Read a dotted path (`objectives.1.activities.0.testResult`) out of an object. */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

/** Immutably write a dotted path, cloning only the nodes along the way. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const clone = (node: unknown, i: number): unknown => {
    if (i === keys.length) return value
    const key = keys[i]
    if (Array.isArray(node)) {
      const next = node.slice()
      next[Number(key)] = clone(node[Number(key)], i + 1)
      return next
    }
    const src = (node ?? {}) as Record<string, unknown>
    return { ...src, [key]: clone(src[key], i + 1) }
  }
  return clone(obj, 0) as T
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* --------------------------------- dates --------------------------------- */

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* -------------------------------- matching ------------------------------- */

/** Case-insensitive substring match used by the typeaheads and search boxes. */
export function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase())
}

/** Split `text` around the first occurrence of `quote` for highlight rendering. */
export function splitOnQuote(
  text: string,
  quote: string,
): { before: string; hit: string; after: string } | null {
  if (!quote) return null
  const idx = text.indexOf(quote)
  if (idx >= 0) {
    return { before: text.slice(0, idx), hit: text.slice(idx, idx + quote.length), after: text.slice(idx + quote.length) }
  }
  // Fall back to a leading fragment so long quotes still land on the right block.
  const probe = quote.slice(0, Math.min(60, quote.length))
  const idx2 = text.indexOf(probe)
  if (idx2 >= 0) {
    const end = Math.min(text.length, idx2 + quote.length)
    return { before: text.slice(0, idx2), hit: text.slice(idx2, end), after: text.slice(end) }
  }
  return null
}
