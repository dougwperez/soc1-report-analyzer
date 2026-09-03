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
  Label,
  ReviewStatusBadge,
  SearchIcon,
  SectionHeading,
  Select,
  SkeletonRow,
  TextInput,
  UserChip,
  extractionStatusMeta,
  reviewStatusMeta,
} from '../components/ui'
import type { ExtractionStatus, ReviewStatus } from '../types'
import { classNames as cx, formatDate, matches, relativeTime } from '../lib/util'

type LoadState = 'loading' | 'ready' | 'error'
type SortKey = 'createdAt' | 'updatedAt' | 'name'

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
  const [search, setSearch] = useState('')
  const [application, setApplication] = useState('')
  const [extraction, setExtraction] = useState('')
  const [review, setReview] = useState('')
  const [period, setPeriod] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [sort, setSort] = useState<SortKey>('createdAt')
  const [forceEmpty, setForceEmpty] = useState(false)

  // The real table is server-paged; the mock shows the same loading beat.
  useEffect(() => {
    setLoad('loading')
    const t = setTimeout(() => setLoad('ready'), 550)
    return () => clearTimeout(t)
  }, [])

  const applicationOptions = useMemo(
    () => Array.from(new Set(state.reports.map((r) => r.application))).sort(),
    [state.reports],
  )
  const periodOptions = useMemo(
    () => Array.from(new Set(state.reports.map((r) => r.periodLabel))).sort(),
    [state.reports],
  )
  const creatorOptions = useMemo(
    () => Array.from(new Set(state.reports.map((r) => r.createdById))),
    [state.reports],
  )

  const filtered = useMemo(() => {
    const rows = state.reports.filter((r) => {
      if (search.trim()) {
        const hit =
          matches(r.name, search) ||
          matches(r.serviceOrganization, search) ||
          matches(r.application, search) ||
          matches(r.controlId, search) ||
          matches(r.id, search)
        if (!hit) return false
      }
      if (application && r.application !== application) return false
      if (extraction && r.extractionStatus !== extraction) return false
      if (review && r.reviewStatus !== review) return false
      if (period && r.periodLabel !== period) return false
      if (createdBy && r.createdById !== createdBy) return false
      return true
    })
    return rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      return new Date(b[sort]).getTime() - new Date(a[sort]).getTime()
    })
  }, [state.reports, search, application, extraction, review, period, createdBy, sort])

  const activeFilters = [search, application, extraction, review, period, createdBy].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setApplication('')
    setExtraction('')
    setReview('')
    setPeriod('')
    setCreatedBy('')
  }

  const rows = forceEmpty ? [] : filtered

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

      {/* -------------------------------- filters ------------------------------- */}
      <Card className="mt-5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <Label htmlFor="hist-search">Search</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <TextInput
                id="hist-search"
                className="pl-8"
                placeholder="Report, service organization, control ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="hist-app">Application</Label>
            <Select id="hist-app" value={application} onChange={(e) => setApplication(e.target.value)}>
              <option value="">All applications</option>
              {applicationOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hist-extraction">Extraction status</Label>
            <Select id="hist-extraction" value={extraction} onChange={(e) => setExtraction(e.target.value)}>
              <option value="">All</option>
              {(Object.keys(extractionStatusMeta) as ExtractionStatus[]).map((k) => (
                <option key={k} value={k}>{extractionStatusMeta[k].label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hist-review">Review status</Label>
            <Select id="hist-review" value={review} onChange={(e) => setReview(e.target.value)}>
              <option value="">All</option>
              {(Object.keys(reviewStatusMeta) as ReviewStatus[]).map((k) => (
                <option key={k} value={k}>{reviewStatusMeta[k].label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hist-period">Reporting period</Label>
            <Select id="hist-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">All periods</option>
              {periodOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hist-creator">Created by</Label>
            <Select id="hist-creator" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}>
              <option value="">Anyone</option>
              {creatorOptions.map((id) => (
                <option key={id} value={id}>{userById(id)?.name ?? id}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="hist-sort">Sort by</Label>
            <Select id="hist-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="createdAt">Upload date</option>
              <option value="updatedAt">Last updated</option>
              <option value="name">Report name</option>
            </Select>
          </div>
        </div>

        {activeFilters > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
            <Badge tone="indigo">
              {activeFilters} filter{activeFilters > 1 ? 's' : ''} applied
            </Badge>
            <span className="text-[12px] text-ink-500">
              Showing {rows.length} of {state.reports.length} reports
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {/* --------------------------------- table -------------------------------- */}
      <Card className="mt-4 overflow-hidden">
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
                title={activeFilters > 0 ? 'No reports match these filters' : 'No reports yet'}
                body={
                  activeFilters > 0
                    ? 'Try widening the reporting period or clearing the search box.'
                    : 'Upload a SOC 1 report to extract its control objectives, exceptions, and CUECs.'
                }
                action={
                  activeFilters > 0 ? (
                    <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
                  ) : (
                    <Button variant="primary" onClick={() => navigate('/extract')}>Extract a report</Button>
                  )
                }
              />
            )}
          </div>
        )}
      </Card>

      {load === 'ready' && rows.length > 0 && (
        <p className={cx('mt-3 text-[12px] text-ink-500')}>
          {rows.length} report{rows.length === 1 ? '' : 's'}
          {activeFilters === 0 && ' · all reports for your business unit'}
        </p>
      )}
    </div>
  )
}
