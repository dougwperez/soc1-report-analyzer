import { useState } from 'react'
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import { classNames as cx } from '../../lib/util'

/** Narrowest either pane may be dragged to, in px. */
export const MIN_PANE_PX = 360
export const DEFAULT_SPLIT = 50

interface Props {
  /** The flex row holding both panes — drag positions are measured against it. */
  containerRef: RefObject<HTMLElement | null>
  /** Left pane width as a percentage of the container. */
  value: number
  onChange: (pct: number) => void
  /** Fired once a drag or key press settles, for persisting the split. */
  onCommit?: (pct: number) => void
}

/**
 * Draggable vertical splitter between the review form and the PDF. It takes no
 * layout width — the hit area straddles the PDF pane's existing border — and
 * supports the keyboard (arrows, Home/End) and double-click to reset.
 */
export default function PaneDivider({ containerRef, value, onChange, onCommit }: Props) {
  const [dragging, setDragging] = useState(false)

  function clampPct(pct: number): number {
    const width = containerRef.current?.getBoundingClientRect().width ?? 0
    if (width <= MIN_PANE_PX * 2) return DEFAULT_SPLIT
    const min = (MIN_PANE_PX / width) * 100
    return Math.min(100 - min, Math.max(min, pct))
  }

  function pctAt(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return value
    return clampPct(((clientX - rect.left) / rect.width) * 100)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    // Stops the drag from starting a text selection across both panes.
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging) onChange(pctAt(e.clientX))
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    onCommit?.(pctAt(e.clientX))
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 2
    let next: number | null = null
    if (e.key === 'ArrowLeft') next = value - step
    else if (e.key === 'ArrowRight') next = value + step
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 100
    if (next === null) return
    e.preventDefault()
    const clamped = clampPct(next)
    onChange(clamped)
    onCommit?.(clamped)
  }

  function reset() {
    onChange(DEFAULT_SPLIT)
    onCommit?.(DEFAULT_SPLIT)
  }

  return (
    <div className="relative z-20 w-0 shrink-0">
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize review and PDF panels"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => setDragging(false)}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        className="group absolute inset-y-0 -left-[5px] w-[11px] cursor-col-resize touch-none focus-visible:outline-none"
      >
        <span
          className={cx(
            'pointer-events-none absolute inset-y-0 left-[4px] w-[3px] transition-colors',
            dragging ? 'bg-brand-500' : 'bg-transparent group-hover:bg-brand-400 group-focus-visible:bg-brand-500',
          )}
        />
      </div>
      {/* Holds the resize cursor over buttons and text while the pointer is down. */}
      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  )
}
