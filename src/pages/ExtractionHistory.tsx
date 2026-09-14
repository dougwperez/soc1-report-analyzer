import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { userById } from '../data/reference'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  ExtractionStatusBadge,
  ReviewStatusBadge,
  SectionHeading,
  Select,
  SkeletonRow,
  UserChip,
} from '../components/ui'
import { formatDate, relativeTime } from '../lib/util'

type LoadState = 'loading' | 'ready' | 'error'

const COLUMNS = [
  'Report name',
  'Service organization',
  'Application',
  'Control ID',
  'Reporting period',
  'Type',
  'Extraction',
  'Review',
  'Created by',
  'Uploaded',
  'Last updated',
  '',
]

export default function ExtractionHistory() {
  const navigate = useNavigate()
  const { state } = useStore()

  const [load, setLoad] = useState<LoadState>('loading')
  const [forceEmpty, setForceEmpty] = useState(false)

  // The real table is server-paged; the mock shows the same loading beat.
  useEffect(() => {
    setLoad('loading')
    const t = setTimeout(() => setLoad('ready'), 550)
    return () => clearTimeout(t)
  }, [])

  // Most recent upload first.
  const sorted = useMemo(
    () =>
      [...state.reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.reports],
  )

  const rows = forceEmpty ? [] : sorted

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <SectionHeading
        title="Extraction History"
        hint="Every SOC 1 report uploaded by your team, with extraction and review status."
        right={
          <div className="flex items-center gap-2">
            {/* Lets a reviewer see each table state without waiting for real data. */}
            <Select
              aria-label="Demo table state"
              className="w-[150px] text-[12px]"
              value={forceEmpty ? 'empty' : load}
              onChange={(e) => {
                const v = e.target.value
                setForceEmpty(v === 'empty')
                setLoad(v === 'empty' ? 'ready' : (v as LoadState))
              }}
            >
              <option value="ready">State: populated</option>
              <option value="loading">State: loading</option>
              <option value="empty">State: empty</option>
              <option value="error">State: error</option>
            </Select>
            <Button variant="primary" onClick={() => navigate('/extract')}>
              Extract new report
            </Button>
          </div>
        }
      />

      {/* --------------------------------- table -------------------------------- */}
      <Card className="mt-5 overflow-hidden">
        {load === 'error' ? (
          <div className="p-5">
            <Callout
              tone="error"
              title="Could not load extraction history"
              action={
                <Button size="sm" variant="secondary" onClick={() => setLoad('ready')}>
                  Retry
                </Button>
              }
            >
              AuditBoard is unavailable (503). Report metadata is served from AuditBoard, so the table cannot be
              rendered. Extractions already running are unaffected and will complete.
            </Callout>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50">
                  {COLUMNS.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {load === 'loading' &&
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={COLUMNS.length} />)}

                {load === 'ready' &&
                  rows.map((r) => {
                    const openable = r.extractionStatus !== 'failed' && !!r.data
                    return (
                      <tr
                        key={r.id}
                        className="group border-b border-ink-100 last:border-b-0 hover:bg-brand-50/40"
                      >
                        <td className="px-3 py-2.5 align-top">
                          <button
                            className="text-left text-[13px] font-medium text-brand-700 hover:underline disabled:cursor-default disabled:text-ink-700 disabled:no-underline"
                            disabled={!openable && r.extractionStatus !== 'processing'}
                            onClick={() =>
                              navigate(r.extractionStatus === 'processing' ? `/progress/${r.id}` : `/reports/${r.id}`)
                            }
                          >
                            {r.name}
                          </button>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-ink-400">{r.id}</span>
                            {r.qualified && <Badge tone="red">Qualified opinion</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top text-[12.5px] text-ink-700">{r.serviceOrganization}</td>
                        <td className="px-3 py-2.5 align-top text-[12.5px] text-ink-700">{r.application}</td>
                        <td className="px-3 py-2.5 align-top font-mono text-[12px] text-ink-700">{r.controlId}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 align-top text-[12.5px] text-ink-700">
                          {r.periodLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-top text-[12.5px] text-ink-600">
                          {r.reportType}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <ExtractionStatusBadge status={r.extractionStatus} />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <ReviewStatusBadge status={r.reviewStatus} />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <UserChip user={userById(r.createdById)} />
                        </td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 align-top text-[12.5px] text-ink-600">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-top text-[12.5px] text-ink-600">
                          {relativeTime(r.updatedAt)}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {r.extractionStatus === 'processing' ? (
                              <Button size="sm" variant="secondary" onClick={() => navigate(`/progress/${r.id}`)}>
                                View progress
                              </Button>
                            ) : r.extractionStatus === 'failed' ? (
                              <Button size="sm" variant="secondary" onClick={() => navigate('/extract')}>
                                Re-upload
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => navigate(`/reports/${r.id}`)}>
                                {r.reviewStatus === 'approved' ? 'View' : 'Review'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {load === 'ready' && rows.length === 0 && (
              <EmptyState
                title="No reports yet"
                body="Upload a SOC 1 report to extract its control objectives, exceptions, and CUECs."
                action={
                  <Button variant="primary" onClick={() => navigate('/extract')}>Extract a report</Button>
                }
              />
            )}
          </div>
        )}
      </Card>

      {load === 'ready' && rows.length > 0 && (
        <p className="mt-3 text-[12px] text-ink-500">
          {rows.length} report{rows.length === 1 ? '' : 's'} · all reports for your business unit
        </p>
      )}
    </div>
  )
}
