import { useMemo, useState } from 'react'
import type { CommentThread, PhaseId, Report } from '../../types'
import { userById } from '../../data/reference'
import { Avatar, Badge, Button, Card, CommentIcon, EmptyState, TextArea } from '../ui'
import { classNames as cx, relativeTime } from '../../lib/util'

interface Props {
  report: Report
  phase: PhaseId
  currentUserId: string
  readOnly: boolean
  onReply: (threadId: string, body: string) => void
  onToggleResolved: (threadId: string, resolved: boolean) => void
  onJumpToAnchor: (path: string) => void
}

export default function CommentsPanel({
  report,
  phase,
  currentUserId,
  readOnly,
  onReply,
  onToggleResolved,
  onJumpToAnchor,
}: Props) {
  const [scope, setScope] = useState<'phase' | 'all'>('phase')
  const [showResolved, setShowResolved] = useState(false)

  const threads = useMemo(() => {
    return report.comments
      .filter((t) => (scope === 'phase' ? t.phase === phase : true))
      .filter((t) => (showResolved ? true : !t.resolved))
      .sort((a, b) => Number(a.resolved) - Number(b.resolved))
  }, [report.comments, phase, scope, showResolved])

  const openCount = report.comments.filter((t) => !t.resolved).length

  return (
    <Card className="mt-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-3.5 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
          <CommentIcon className="h-4 w-4 text-ink-400" />
          Discussion
        </h3>
        {openCount > 0 && <Badge tone="amber">{openCount} open</Badge>}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant={scope === 'phase' ? 'subtle' : 'ghost'} onClick={() => setScope('phase')}>
            This section
          </Button>
          <Button size="sm" variant={scope === 'all' ? 'subtle' : 'ghost'} onClick={() => setScope('all')}>
            All sections
          </Button>
          <span className="mx-1 h-4 w-px bg-ink-200" />
          <Button size="sm" variant="ghost" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </Button>
        </div>
      </div>

      {threads.length === 0 ? (
        <EmptyState
          title="No comments here"
          body="Use the comment action on any field to start a thread anchored to that value."
          icon={<CommentIcon className="h-5 w-5" />}
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {threads.map((t) => (
            <Thread
              key={t.id}
              thread={t}
              currentUserId={currentUserId}
              readOnly={readOnly}
              onReply={onReply}
              onToggleResolved={onToggleResolved}
              onJumpToAnchor={onJumpToAnchor}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

function Thread({
  thread,
  currentUserId,
  readOnly,
  onReply,
  onToggleResolved,
  onJumpToAnchor,
}: {
  thread: CommentThread
  currentUserId: string
  readOnly: boolean
  onReply: (threadId: string, body: string) => void
  onToggleResolved: (threadId: string, resolved: boolean) => void
  onJumpToAnchor: (path: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [replying, setReplying] = useState(false)

  return (
    <li className={cx('px-3.5 py-3', thread.resolved && 'bg-ink-50/60')}>
      <div className="flex flex-wrap items-center gap-2">
        {thread.anchorPath ? (
          <button
            onClick={() => onJumpToAnchor(thread.anchorPath!)}
            className="text-[12px] font-medium text-brand-700 hover:underline"
          >
            {thread.anchorLabel}
          </button>
        ) : (
          <span className="text-[12px] font-medium text-ink-700">{thread.anchorLabel}</span>
        )}
        {thread.resolved && (
          <Badge tone="green">
            Resolved by {userById(thread.resolvedBy)?.name ?? 'a reviewer'}
            {thread.resolvedAt ? ` · ${relativeTime(thread.resolvedAt)}` : ''}
          </Badge>
        )}
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => onToggleResolved(thread.id, !thread.resolved)}
          >
            {thread.resolved ? 'Reopen' : 'Resolve'}
          </Button>
        )}
      </div>

      <ul className="mt-2 flex flex-col gap-2.5">
        {thread.entries.map((entry) => {
          const author = userById(entry.authorId)
          return (
            <li key={entry.id} className="flex items-start gap-2.5">
              <Avatar user={author} size={22} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-medium text-ink-800">{author?.name ?? 'Unknown'}</span>
                  <span className="text-[11px] text-ink-400">{relativeTime(entry.createdAt)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-700">{entry.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {!readOnly && !thread.resolved && (
        <div className="mt-2.5 pl-8">
          {replying ? (
            <div>
              <TextArea
                autoFocus
                rows={3}
                value={draft}
                placeholder="Write a reply…"
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="mt-1.5 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!draft.trim()}
                  onClick={() => {
                    onReply(thread.id, draft.trim())
                    setDraft('')
                    setReplying(false)
                  }}
                >
                  Reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setReplying(true)}>
              Reply as {userById(currentUserId)?.name.split(' ')[0]}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
