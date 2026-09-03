import { useEffect, useMemo, useRef, useState } from 'react'
import { getPages } from '../../data/pdfDocument'
import type { PdfBlock } from '../../data/pdfDocument'
import type { SourceAnnotation } from '../../types'
import { AlertIcon, Button, Callout, ChevronIcon, CloseIcon, Spinner } from '../ui'
import { classNames as cx, splitOnQuote } from '../../lib/util'

interface Props {
  documentId: 'standard' | 'qualified'
  fileName: string
  focus: { annotation: SourceAnnotation; label: string } | null
  /** Label of a selected field that carries no page citation. */
  missingSource?: string | null
  onHide: () => void
}

/* ------------------------------------------------------------------ *
 * A stand-in for the real PDF.js viewer. It renders the mock document
 * page by page and highlights the exact quotation an extractor cited,
 * so the "jump to source" behaviour is real even though the file is not.
 * ------------------------------------------------------------------ */

export default function PdfViewer({ documentId, fileName, focus, missingSource, onHide }: Props) {
  const pages = useMemo(() => getPages(documentId), [documentId])
  const scrollRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [visiblePage, setVisiblePage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [documentId])

  /**
   * Position `el` inside the scroll container, `offset` px below its top edge.
   * Set directly rather than via smooth scrolling — smooth scrollTo is a silent
   * no-op on this container in some browsers, which loses the jump entirely.
   */
  function scrollToElement(el: HTMLElement, offset: number) {
    const container = scrollRef.current
    if (!container) return
    const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top
    container.scrollTop = container.scrollTop + delta - offset
  }

  // Centre the highlighted quotation, falling back to the top of the cited page
  // when the quote could not be matched.
  useEffect(() => {
    if (!focus || loading || failed) return
    let raf = 0
    const t = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        const container = scrollRef.current
        if (!container) return
        const mark = markRef.current && document.contains(markRef.current) ? markRef.current : null
        const target = mark ?? pageRefs.current[focus.annotation.page]
        if (!target) return
        scrollToElement(target, mark ? container.clientHeight / 2 - 40 : 8)
        setVisiblePage(focus.annotation.page)
      })
    }, 60)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [focus, loading, failed])

  function goToPage(n: number) {
    const clamped = Math.min(pages.length, Math.max(1, n))
    const el = pageRefs.current[clamped]
    if (el) scrollToElement(el, 8)
    setVisiblePage(clamped)
  }

  function onScroll() {
    const container = scrollRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top
    let current = 1
    for (const p of pages) {
      const el = pageRefs.current[p.n]
      if (el && el.getBoundingClientRect().top - top <= 80) current = p.n
    }
    setVisiblePage(current)
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-ink-200 bg-ink-100">
      {/* -------------------------------- toolbar ------------------------------- */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-ink-200 bg-white px-3">
        <span className="truncate text-[12.5px] font-medium text-ink-800" title={fileName}>
          {fileName}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => goToPage(visiblePage - 1)} aria-label="Previous page">
            <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
          </Button>
          <span className="tnum text-[12px] text-ink-600">
            <input
              aria-label="Page number"
              className="w-9 rounded border border-ink-200 bg-white px-1 py-0.5 text-center text-[12px]"
              value={visiblePage}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isNaN(n)) goToPage(n)
              }}
            />
            <span className="ml-1 text-ink-400">/ {pages.length}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => goToPage(visiblePage + 1)} aria-label="Next page">
            <ChevronIcon className="h-3.5 w-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px bg-ink-200" />
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.75, z - 0.15))} aria-label="Zoom out">
            −
          </Button>
          <span className="tnum w-9 text-center text-[12px] text-ink-600">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Zoom in">
            +
          </Button>
          <span className="mx-1 h-4 w-px bg-ink-200" />
          <Button
            size="sm"
            variant="ghost"
            title="Simulate a PDF load failure"
            aria-label="Simulate a PDF load failure"
            onClick={() => setFailed((f) => !f)}
          >
            <AlertIcon className={cx('h-3.5 w-3.5', failed && 'text-red-600')} />
          </Button>
          <Button size="sm" variant="ghost" onClick={onHide} aria-label="Hide PDF panel">
            <CloseIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ------------------------------ source banner --------------------------- */}
      {!focus && missingSource && !failed && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-amber-800">
            <AlertIcon className="h-3.5 w-3.5" /> No source annotation
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-800">
            “{missingSource}” has no page citation, so there is nothing to highlight. It was entered by a reviewer,
            suggested from historical reviews, or the extractor could not locate supporting text. Verify it against the
            document manually before signing off.
          </p>
        </div>
      )}
      {/* -------------------------------- document ------------------------------ */}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {failed ? (
          <div className="mx-auto max-w-md pt-10">
            <Callout
              tone="error"
              title="The PDF could not be displayed"
              action={
                <Button size="sm" variant="secondary" onClick={() => setFailed(false)}>
                  Retry
                </Button>
              }
            >
              The document stream returned an error after 2 attempts. Extracted values and their page citations are
              still available on the left — you just cannot view the source until the document loads.
            </Callout>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 pt-16 text-[12.5px] text-ink-500">
            <Spinner className="h-4 w-4" /> Loading document…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {pages.map((page) => (
              <div
                key={page.n}
                ref={(el) => {
                  pageRefs.current[page.n] = el
                }}
                className="w-full rounded-sm border border-ink-300 bg-white shadow-sm"
                style={{ maxWidth: `${720 * zoom}px` }}
              >
                <div className="px-10 py-9 font-serif text-ink-900" style={{ fontSize: `${13 * zoom}px` }}>
                  {page.blocks.map((block, i) => (
                    <PdfBlockView
                      key={i}
                      block={block}
                      quote={focus?.annotation.page === page.n ? focus.annotation.quote : null}
                      markRef={markRef}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 px-10 py-2 font-sans text-[10.5px] text-ink-400">
                  <span>{page.label}</span>
                  <span className="tnum">Page {page.n} of {pages.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ block rendering ----------------------------- */

function PdfBlockView({
  block,
  quote,
  markRef,
}: {
  block: PdfBlock
  quote: string | null
  markRef: React.MutableRefObject<HTMLElement | null>
}) {
  switch (block.t) {
    case 'h1':
      return <h1 className="mb-3 text-center text-[1.5em] font-bold leading-tight">{withMark(block.text, quote, markRef)}</h1>
    case 'h2':
      return <h2 className="mb-2.5 mt-4 text-[1.15em] font-bold leading-snug first:mt-0">{withMark(block.text, quote, markRef)}</h2>
    case 'h3':
      return <h3 className="mb-1.5 mt-3.5 text-[1.02em] font-semibold first:mt-0">{withMark(block.text, quote, markRef)}</h3>
    case 'p':
      return <p className="mb-2.5 text-justify leading-relaxed">{withMark(block.text, quote, markRef)}</p>
    case 'li':
      return (
        <p className="mb-2 flex gap-2 leading-relaxed">
          <span className="shrink-0 text-ink-400">•</span>
          <span className="text-justify">{withMark(block.text, quote, markRef)}</span>
        </p>
      )
    case 'note':
      return (
        <p className="mb-2.5 border-l-2 border-ink-200 pl-3 text-[0.92em] italic leading-relaxed text-ink-600">
          {withMark(block.text, quote, markRef)}
        </p>
      )
    case 'spacer':
      return <div className="h-6" />
    case 'table':
      return (
        <table className="mb-3 w-full border-collapse text-[0.88em]">
          <thead>
            <tr>
              {block.head.map((h) => (
                <th key={h} className="border border-ink-300 bg-ink-100 px-2 py-1 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-ink-300 px-2 py-1 align-top leading-snug">
                    {withMark(cell, quote, markRef)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    default:
      return null
  }
}

/** Wrap the cited quotation in a highlight, if it appears in this block. */
function withMark(
  text: string,
  quote: string | null,
  markRef: React.MutableRefObject<HTMLElement | null>,
) {
  if (!quote) return text
  const parts = splitOnQuote(text, quote)
  if (!parts) return text
  return (
    <>
      {parts.before}
      <mark
        ref={(el) => {
          if (el) markRef.current = el
        }}
        className="animate-highlight rounded-[2px] bg-yellow-300/50 px-[1px] ring-1 ring-yellow-500/40"
      >
        {parts.hit}
      </mark>
      {parts.after}
    </>
  )
}
