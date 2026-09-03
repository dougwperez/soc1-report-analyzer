import { useEffect, useRef, useState } from 'react'
import type { Field } from '../../types'
import {
  Badge,
  Button,
  CheckIcon,
  CommentIcon,
  ConfidenceMeter,
  PencilIcon,
  OriginBadge,
  Select,
  SparkIcon,
  TargetIcon,
  TextArea,
  TextInput,
  Typeahead,
} from '../ui'
import type { TypeaheadOption } from '../ui'
import { classNames as cx, formatDate } from '../../lib/util'
import { userById } from '../../data/reference'

export interface FieldRowProps {
  path: string
  label: string
  field: Field<string>
  kind?: 'text' | 'textarea' | 'select' | 'typeahead'
  options?: readonly string[]
  typeaheadOptions?: TypeaheadOption[]
  placeholder?: string
  /** Approved reports and unauthorised roles get a read-only view. */
  readOnly: boolean
  active: boolean
  commentCount: number
  dense?: boolean
  onSelect: (path: string, field: Field<string>, label: string) => void
  onEdit: (path: string, value: string) => void
  onConfirm: (path: string) => void
  onComment: (path: string, label: string) => void
  /** Surfaced when a save is rejected by the server. */
  saveError?: string | null
}

export default function FieldRow({
  path,
  label,
  field,
  kind = 'text',
  options,
  typeaheadOptions,
  placeholder,
  readOnly,
  active,
  commentCount,
  dense,
  onSelect,
  onEdit,
  onConfirm,
  onComment,
  saveError,
}: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(field.value)
  const [showRationale, setShowRationale] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (!editing) setDraft(field.value)
  }, [field.value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const needsConfirm =
    !field.confirmed && (field.origin === 'ai_recommendation' || field.origin === 'rolled_forward')
  const empty = !field.value

  function startEdit(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (readOnly) return
    setDraft(field.value)
    setEditing(true)
  }

  function save() {
    onEdit(path, draft)
    setEditing(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(path, field, label)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !editing) onSelect(path, field, label)
      }}
      className={cx(
        'group relative cursor-pointer border-l-2 pl-3 pr-2 transition-colors',
        dense ? 'py-1.5' : 'py-2',
        active ? 'border-brand-500 bg-brand-50/70' : 'border-transparent hover:bg-ink-50',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx('shrink-0 pt-[1px]', dense ? 'w-40' : 'w-48')}>
          <p className="text-[12px] font-medium leading-snug text-ink-600">{label}</p>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div onClick={(e) => e.stopPropagation()}>
              {kind === 'textarea' && (
                <TextArea
                  ref={inputRef as React.Ref<HTMLTextAreaElement>}
                  rows={4}
                  value={draft}
                  placeholder={placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
              {kind === 'select' && (
                <Select
                  ref={inputRef as React.Ref<HTMLSelectElement>}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              )}
              {kind === 'typeahead' && (
                <Typeahead
                  options={typeaheadOptions ?? []}
                  value={draft}
                  onChange={setDraft}
                  placeholder={placeholder ?? 'Search…'}
                  emptyHint="No control matches — mapping must be selected from the control library"
                />
              )}
              {kind === 'text' && (
                <TextInput
                  ref={inputRef as React.Ref<HTMLInputElement>}
                  value={draft}
                  placeholder={placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                />
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={save}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                {saveError && <span className="text-[12px] text-red-700">{saveError}</span>}
              </div>
            </div>
          ) : (
            <p
              className={cx(
                'whitespace-pre-wrap text-[13px] leading-relaxed',
                empty ? 'italic text-ink-400' : 'text-ink-900',
              )}
            >
              {empty ? 'Not provided' : field.value}
            </p>
          )}

          {/* ------------------------------ provenance ----------------------------- */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <OriginBadge origin={field.origin} edited={field.edited} confirmed={field.confirmed} />

            {field.source ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(path, field, label)
                }}
                className="inline-flex items-center gap-1 rounded border border-ink-200 bg-white px-1.5 py-[1px] text-[11px] text-ink-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                title="Jump to this quotation in the source PDF"
              >
                <TargetIcon className="h-3 w-3" /> p. {field.source.page}
              </button>
            ) : field.origin === 'ai' ? (
              <Badge tone="amber" title="The extractor returned a value with no page citation — verify it manually">
                No source citation
              </Badge>
            ) : null}

            {field.source && <ConfidenceMeter value={field.source.confidence} />}

            {field.rolledFrom && !field.confirmed && (
              <span className="text-[11px] text-amber-700">from {field.rolledFrom}</span>
            )}
            {field.edited && field.editedBy && (
              <span className="text-[11px] text-ink-500">
                {userById(field.editedBy)?.name ?? 'Reviewer'} · {field.editedAt ? formatDate(field.editedAt) : ''}
              </span>
            )}
            {commentCount > 0 && (
              <Badge tone="neutral" title={`${commentCount} comment${commentCount > 1 ? 's' : ''}`}>
                <CommentIcon className="h-3 w-3" /> {commentCount}
              </Badge>
            )}
          </div>

          {/* ----------------------- recommendation rationale ---------------------- */}
          {field.rationale && (
            <div className="mt-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRationale((v) => !v)
                }}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ai-700 hover:underline"
              >
                <SparkIcon className="h-3 w-3" />
                {showRationale ? 'Hide supporting context' : 'Why this was suggested'}
              </button>
              {showRationale && (
                <p className="mt-1 rounded border border-ai-200 bg-ai-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-ai-700">
                  {field.rationale}
                </p>
              )}
            </div>
          )}

          {needsConfirm && !readOnly && (
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm(path)
                }}
              >
                <CheckIcon className="h-3.5 w-3.5" />
                {field.origin === 'rolled_forward' ? 'Reconfirm for this period' : 'Confirm suggestion'}
              </Button>
              <span className="text-[11.5px] text-ink-500">or edit the value to record your own determination</span>
            </div>
          )}
        </div>

        {/* -------------------------------- actions ------------------------------- */}
        {!editing && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onComment(path, label)
              }}
              title="Add a comment"
              aria-label={`Comment on ${label}`}
            >
              <CommentIcon className="h-3.5 w-3.5" />
            </Button>
            {!readOnly && (
              <Button size="sm" variant="ghost" onClick={startEdit} title="Edit value" aria-label={`Edit ${label}`}>
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
