import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { applications, controlIds, freshExtractors } from '../data/reference'
import {
  Badge,
  Button,
  Callout,
  Card,
  DocIcon,
  FieldError,
  Label,
  LockIcon,
  SectionHeading,
  Spinner,
  TextInput,
  Typeahead,
  UploadIcon,
  CloseIcon,
  CheckIcon,
} from '../components/ui'
import type { Report } from '../types'
import { classNames as cx } from '../lib/util'

/* ------------------------------------------------------------------ *
 * Sample documents. Real drag-and-drop is accepted too — the document
 * state is inferred from the file name so every path stays reachable
 * without shipping fixture PDFs.
 * ------------------------------------------------------------------ */

type DocState = 'standard' | 'protected' | 'ocr' | 'invalid' | 'upload_failure'

interface SampleDoc {
  fileName: string
  sizeLabel: string
  pages: number
  state: DocState
  scenario: Report['scenario']
  documentId: 'standard' | 'qualified'
  app: string
  serviceOrg: string
  controlId: string
  reportName: string
  note: string
}

const SAMPLE_PASSWORD = 'demo1234'

const sampleDocs: SampleDoc[] = [
  {
    fileName: 'northwind-paycycle-fy2025-soc1.pdf',
    sizeLabel: '4.8 MB',
    pages: 18,
    state: 'standard',
    scenario: 'standard',
    documentId: 'standard',
    app: 'Northwind PayCycle',
    serviceOrg: 'Northwind Payroll Services, Inc.',
    controlId: 'FIN-PAY-014',
    reportName: 'Northwind PayCycle — FY2025 SOC 1 Type 2',
    note: 'Standard text-layer PDF. Unqualified opinion with three testing exceptions.',
  },
  {
    fileName: 'northwind-paycycle-fy2025-reissued.pdf',
    sizeLabel: '5.1 MB',
    pages: 18,
    state: 'standard',
    scenario: 'qualified',
    documentId: 'qualified',
    app: 'Northwind PayCycle',
    serviceOrg: 'Northwind Payroll Services, Inc.',
    controlId: 'FIN-PAY-014',
    reportName: 'Northwind PayCycle — FY2025 SOC 1 Type 2 (Reissued)',
    note: 'Qualified auditor opinion. Triggers the elevated review workflow.',
  },
  {
    fileName: 'larkspur-fund-accounting-fy2025-protected.pdf',
    sizeLabel: '7.2 MB',
    pages: 96,
    state: 'protected',
    scenario: 'partial',
    documentId: 'standard',
    app: 'Larkspur Fund Accounting',
    serviceOrg: 'Larkspur Fund Administration LLC',
    controlId: 'FIN-INV-018',
    reportName: 'Larkspur Fund Accounting — FY2025 SOC 1 Type 2',
    note: `Password protected — use “${SAMPLE_PASSWORD}”. One extractor fails so you can retry it.`,
  },
  {
    fileName: 'ashfield-taxfile-fy2025-scanned.pdf',
    sizeLabel: '22.6 MB',
    pages: 74,
    state: 'ocr',
    scenario: 'ocr_fail',
    documentId: 'standard',
    app: 'Ashfield TaxFile',
    serviceOrg: 'Ashfield Tax Solutions, Inc.',
    controlId: 'FIN-TAX-006',
    reportName: 'Ashfield TaxFile — FY2025 SOC 1 Type 2',
    note: 'Copy-locked scan. Falls back to OCR, which fails the confidence threshold.',
  },
  {
    fileName: 'sable-treasury-fy2025-soc1.pdf',
    sizeLabel: '9.4 MB',
    pages: 61,
    state: 'upload_failure',
    scenario: 'standard',
    documentId: 'standard',
    app: 'Sable Treasury Workstation',
    serviceOrg: 'Sable Financial Technologies',
    controlId: 'FIN-TRE-009',
    reportName: 'Sable Treasury Workstation — FY2025 SOC 1 Type 2',
    note: 'Upload fails at the storage step. Demonstrates the retry path.',
  },
  {
    fileName: 'vendor-security-questionnaire.docx',
    sizeLabel: '340 KB',
    pages: 0,
    state: 'invalid',
    scenario: 'standard',
    documentId: 'standard',
    app: '',
    serviceOrg: '',
    controlId: '',
    reportName: '',
    note: 'Not a PDF. Rejected by client-side validation.',
  },
]

/** Infer a document state from a real dropped file so the mock stays honest. */
function inferFromRealFile(file: File): SampleDoc {
  const lower = file.name.toLowerCase()
  const state: DocState = !lower.endsWith('.pdf')
    ? 'invalid'
    : /protect|password|secure/.test(lower)
      ? 'protected'
      : /scan|ocr|locked|image/.test(lower)
        ? 'ocr'
        : 'standard'
  return {
    fileName: file.name,
    sizeLabel: `${(file.size / 1_048_576).toFixed(1)} MB`,
    pages: 18,
    state,
    scenario: state === 'ocr' ? 'ocr_fail' : 'standard',
    documentId: 'standard',
    app: '',
    serviceOrg: '',
    controlId: '',
    reportName: file.name.replace(/\.pdf$/i, ''),
    note: 'Uploaded from your machine. The mock reads the name only — no file content is parsed or transmitted.',
  }
}

export default function ExtractReport() {
  const navigate = useNavigate()
  const { state, dispatch, toast } = useStore()

  const [doc, setDoc] = useState<SampleDoc | null>(null)
  const [dragging, setDragging] = useState(false)
  const [reportName, setReportName] = useState('')
  const [application, setApplication] = useState('')
  const [controlId, setControlId] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fileError =
    doc?.state === 'invalid'
      ? 'Unsupported file type. Upload a PDF of the SOC 1 report — Word, Excel, and ZIP files are not accepted.'
      : null

  const errors = {
    file: !doc ? 'Select a SOC 1 PDF to continue.' : fileError,
    reportName: !reportName.trim() ? 'Enter a report name.' : null,
    application: !application.trim() ? 'Select or enter the application this report covers.' : null,
    controlId: !controlId.trim() ? 'Select the internal control this report supports.' : null,
    password:
      doc?.state === 'protected' && !password.trim()
        ? 'This PDF is password protected. Enter the document password to allow text extraction.'
        : null,
  }

  const canSubmit =
    !!doc && !fileError && !!reportName.trim() && !!application.trim() && !!controlId.trim() &&
    (doc.state !== 'protected' || !!password.trim())

  const appOptions = useMemo(
    () => applications.map((a) => ({ value: a.name, label: a.name, hint: a.serviceOrg })),
    [],
  )
  const controlOptions = useMemo(
    () => controlIds.map((c) => ({ value: c.id, label: c.id, hint: c.label })),
    [],
  )

  function selectDoc(next: SampleDoc) {
    setDoc(next)
    setUploadError(null)
    setSubmitted(false)
    if (next.reportName) setReportName(next.reportName)
    if (next.app) setApplication(next.app)
    if (next.controlId) setControlId(next.controlId)
    if (next.state !== 'protected') setPassword('')
  }

  function clearDoc() {
    setDoc(null)
    setUploadError(null)
    setSubmitted(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) selectDoc(inferFromRealFile(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setUploadError(null)
    if (!canSubmit || !doc) return

    // Wrong password is caught server-side in the real system, so surface it after the request.
    setUploading(true)
    await new Promise((r) => setTimeout(r, 1100))

    if (doc.state === 'protected' && password.trim() !== SAMPLE_PASSWORD) {
      setUploading(false)
      setUploadError(
        `Incorrect document password. The PDF could not be decrypted, so no text was extracted. (Sample password: ${SAMPLE_PASSWORD})`,
      )
      return
    }

    if (doc.state === 'upload_failure') {
      setUploading(false)
      setUploadError(
        'Upload failed: the document store returned 503 Service Unavailable after 3 attempts. The file was not saved and no extraction was started.',
      )
      return
    }

    const now = new Date().toISOString()
    const id = `RPT-${2100 + state.reports.length}`
    const appMeta = applications.find((a) => a.name === application)
    const report: Report = {
      id,
      name: reportName.trim(),
      serviceOrganization: doc.serviceOrg || appMeta?.serviceOrg || application,
      application,
      controlId,
      reportType: 'SOC 1 Type 2',
      documentId: doc.documentId,
      scenario: doc.scenario,
      fileName: doc.fileName,
      periodStart: '2024-10-01',
      periodEnd: '2025-09-30',
      periodLabel: 'Oct 1, 2024 – Sep 30, 2025',
      auditorFirm: 'Braddock & Whitfield LLP',
      extractionStatus: 'processing',
      reviewStatus: 'not_started',
      createdById: state.currentUserId,
      assignedReviewerId: state.currentUserId,
      watcherIds: [],
      createdAt: now,
      updatedAt: now,
      qualified: doc.documentId === 'qualified',
      extractors: freshExtractors(),
      data: null,
      verifications: {},
      comments: [],
      audit: [
        {
          id: `audit-${id}`,
          at: now,
          userId: state.currentUserId,
          summary: `Uploaded ${doc.fileName} and started extraction`,
        },
      ],
      priorReportName:
        application === 'Northwind PayCycle' ? 'Northwind PayCycle — FY2024 SOC 1 Type 2' : undefined,
    }

    dispatch({ type: 'create_report', report })
    setUploading(false)
    toast('info', 'Extraction started', `${report.name} · 7 extractors queued`)
    navigate(`/progress/${id}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-7">
      <SectionHeading
        title="Extract a SOC 1 report"
        hint="Upload a SOC 1 Type 2 report to extract report metadata, control objectives, exceptions, CUECs, subservice organizations, and vendors. Extraction typically completes in under two minutes; a reviewer then validates every value against the source document."
      />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} noValidate>
          <Card className="p-5">
            {/* ----------------------------- dropzone ---------------------------- */}
            <Label htmlFor="file-input">SOC 1 PDF</Label>
            {!doc ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cx(
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                  dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-300 bg-ink-50/60',
                  submitted && errors.file && 'border-red-400 bg-red-50/40',
                )}
              >
                <UploadIcon className="mb-2 h-6 w-6 text-ink-400" />
                <p className="text-[13.5px] font-medium text-ink-800">Drag a SOC 1 PDF here</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">or</p>
                <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
                  Browse files
                </Button>
                <input
                  ref={inputRef}
                  id="file-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) selectDoc(inferFromRealFile(f))
                  }}
                />
                <p className="mt-3 text-[11.5px] text-ink-400">PDF up to 50 MB · single file per report</p>
              </div>
            ) : (
              <div
                className={cx(
                  'flex items-start gap-3 rounded-lg border px-3.5 py-3',
                  fileError ? 'border-red-300 bg-red-50' : 'border-ink-200 bg-ink-50',
                )}
              >
                <DocIcon className={cx('mt-0.5 h-5 w-5 shrink-0', fileError ? 'text-red-500' : 'text-ink-400')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink-900">{doc.fileName}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    {doc.sizeLabel}
                    {doc.pages > 0 && ` · ${doc.pages} pages`}
                    {doc.state === 'protected' && ' · encrypted'}
                    {doc.state === 'ocr' && ' · no text layer, OCR required'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {doc.state === 'standard' && <Badge tone="green">Text layer detected</Badge>}
                    {doc.state === 'protected' && (
                      <Badge tone="amber">
                        <LockIcon className="h-3 w-3" /> Password protected
                      </Badge>
                    )}
                    {doc.state === 'ocr' && <Badge tone="amber">Copy-locked · OCR required</Badge>}
                    {doc.state === 'invalid' && <Badge tone="red">Unsupported file type</Badge>}
                    {doc.state === 'upload_failure' && <Badge tone="neutral">Text layer detected</Badge>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearDoc}
                  className="rounded p-1 text-ink-400 hover:bg-ink-200 hover:text-ink-700"
                  aria-label="Remove file"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {submitted && errors.file && <FieldError>{errors.file}</FieldError>}

            {/* ------------------------------ metadata --------------------------- */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="report-name">Report name</Label>
                <Typeahead
                  id="report-name"
                  options={sampleDocs.filter((d) => d.reportName).map((d) => ({ value: d.reportName, label: d.reportName, hint: d.serviceOrg }))}
                  value={reportName}
                  onChange={setReportName}
                  placeholder="Start typing, or pick a previously used name"
                  emptyHint="No prior report matches — a new name will be created"
                />
                {submitted && errors.reportName && <FieldError>{errors.reportName}</FieldError>}
              </div>

              <div>
                <Label htmlFor="application">Application</Label>
                <Typeahead
                  id="application"
                  options={appOptions}
                  value={application}
                  onChange={setApplication}
                  placeholder="Search applications"
                />
                {submitted && errors.application && <FieldError>{errors.application}</FieldError>}
              </div>

              <div>
                <Label htmlFor="control-id">Control ID</Label>
                <Typeahead
                  id="control-id"
                  options={controlOptions}
                  value={controlId}
                  onChange={setControlId}
                  allowCustom={false}
                  placeholder="Search control IDs"
                />
                {submitted && errors.controlId && <FieldError>{errors.controlId}</FieldError>}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="password" hint="(only for encrypted PDFs)">
                  Document password
                </Label>
                <TextInput
                  id="password"
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={doc?.state === 'protected' ? 'Required for this document' : 'Leave blank if not protected'}
                />
                {submitted && errors.password && <FieldError>{errors.password}</FieldError>}
              </div>
            </div>

            {uploadError && (
              <div className="mt-4">
                <Callout
                  tone="error"
                  title="Upload failed"
                  action={
                    <Button type="submit" size="sm" variant="secondary" disabled={uploading}>
                      Retry
                    </Button>
                  }
                >
                  {uploadError}
                </Callout>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
              <Button type="submit" variant="primary" disabled={!canSubmit || uploading}>
                {uploading ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4" /> Upload &amp; Extract
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={clearDoc} disabled={uploading}>
                Clear
              </Button>
              {!canSubmit && (
                <span className="text-[12px] text-ink-500">
                  A file, report name, application, and control ID are required.
                </span>
              )}
            </div>
          </Card>
        </form>

        {/* ------------------------------- sidebar ------------------------------ */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink-900">Sample documents</h3>
            <p className="mt-0.5 text-[12px] text-ink-500">
              Load a fictional report to exercise each document state.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {sampleDocs.map((s) => (
                <li key={s.fileName}>
                  <button
                    type="button"
                    onClick={() => selectDoc(s)}
                    className={cx(
                      'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                      doc?.fileName === s.fileName
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-ink-800">{s.fileName}</span>
                      {doc?.fileName === s.fileName && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">{s.note}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink-900">Supported documents</h3>
            <dl className="mt-2.5 flex flex-col gap-2.5 text-[12px] leading-relaxed">
              <div>
                <dt className="font-medium text-ink-800">Text-layer PDF</dt>
                <dd className="text-ink-500">Extracted directly. Highest accuracy and the fastest path.</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-800">Password-protected PDF</dt>
                <dd className="text-ink-500">
                  Supply the document password. It is used once to decrypt the file and is not stored.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink-800">Copy-locked or scanned PDF</dt>
                <dd className="text-ink-500">
                  Falls back to OCR. Slower, and page citations may be less precise — confirm each quotation.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink-800">Not supported</dt>
                <dd className="text-ink-500">Word, Excel, images, ZIP archives, and files over 50 MB.</dd>
              </div>
            </dl>
          </Card>

          <Callout tone="ai" title="What the model does">
            Seven section-specific extractors read the full document in parallel and return structured JSON with a
            page citation for each value. A reviewer confirms every field — the model does not make the compliance
            decision.
          </Callout>
        </div>
      </div>
    </div>
  )
}
