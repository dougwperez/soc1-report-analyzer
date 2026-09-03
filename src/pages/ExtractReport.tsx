import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { applications, freshExtractors } from '../data/reference'
import {
  Badge,
  Button,
  Callout,
  Card,
  CloseIcon,
  DocIcon,
  FieldError,
  Label,
  LockIcon,
  Spinner,
  TextInput,
  UploadIcon,
} from '../components/ui'
import type { Report } from '../types'
import { classNames as cx } from '../lib/util'

/* ------------------------------------------------------------------ *
 * Upload screen. The document's state, and the report metadata that
 * goes with it, are inferred from the file itself — the reviewer only
 * has to supply a password when the PDF is actually encrypted.
 * ------------------------------------------------------------------ */

type DocState = 'standard' | 'protected' | 'ocr' | 'invalid' | 'upload_failure'

interface PickedDoc {
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
}

const SAMPLE_PASSWORD = 'demo1234'

/** Known fictional documents, matched on file name. */
const knownDocs: PickedDoc[] = [
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
  },
]

/** Title-case a file name into a usable report name. */
function nameFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Match a dropped file against the known documents, else infer its state from
 * the file name so every document path stays reachable without fixture PDFs.
 */
function describe(file: File): PickedDoc {
  const lower = file.name.toLowerCase()
  const known = knownDocs.find((d) => d.fileName === lower)
  if (known) return { ...known, sizeLabel: file.size ? `${(file.size / 1_048_576).toFixed(1)} MB` : known.sizeLabel }

  const state: DocState = !lower.endsWith('.pdf')
    ? 'invalid'
    : /protect|password|encrypted|secure/.test(lower)
      ? 'protected'
      : /scan|ocr|locked|image/.test(lower)
        ? 'ocr'
        : /fail|503|error/.test(lower)
          ? 'upload_failure'
          : 'standard'

  const qualified = /reissue|qualified/.test(lower)
  const guessedApp = applications.find((a) => lower.includes(a.name.toLowerCase().split(' ')[0]))

  return {
    fileName: file.name,
    sizeLabel: file.size ? `${(file.size / 1_048_576).toFixed(1)} MB` : '—',
    pages: 18,
    state,
    scenario: state === 'ocr' ? 'ocr_fail' : state === 'protected' ? 'partial' : qualified ? 'qualified' : 'standard',
    documentId: qualified ? 'qualified' : 'standard',
    app: guessedApp?.name ?? 'Northwind PayCycle',
    serviceOrg: guessedApp?.serviceOrg ?? 'Northwind Payroll Services, Inc.',
    controlId: 'FIN-PAY-014',
    reportName: nameFromFile(file.name),
  }
}

export default function ExtractReport() {
  const navigate = useNavigate()
  const { state, dispatch, toast } = useStore()

  const [doc, setDoc] = useState<PickedDoc | null>(null)
  const [dragging, setDragging] = useState(false)
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fileError =
    doc?.state === 'invalid'
      ? 'Unsupported file type. Upload a PDF of the SOC 1 report — Word, Excel, and ZIP files are not accepted.'
      : null

  const passwordError =
    doc?.state === 'protected' && !password.trim()
      ? 'This PDF is password protected. Enter the document password to allow text extraction.'
      : null

  const canSubmit = !!doc && !fileError && (doc.state !== 'protected' || !!password.trim())

  function selectFile(file: File) {
    setDoc(describe(file))
    setPassword('')
    setUploadError(null)
    setSubmitted(false)
  }

  function clearDoc() {
    setDoc(null)
    setPassword('')
    setUploadError(null)
    setSubmitted(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setUploadError(null)
    if (!canSubmit || !doc) return

    // Decryption and storage both happen server-side, so their failures surface
    // only after the request.
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
    const report: Report = {
      id,
      name: doc.reportName,
      serviceOrganization: doc.serviceOrg,
      application: doc.app,
      controlId: doc.controlId,
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
        doc.app === 'Northwind PayCycle' ? 'Northwind PayCycle — FY2024 SOC 1 Type 2' : undefined,
    }

    dispatch({ type: 'create_report', report })
    setUploading(false)
    toast('info', 'Extraction started', `${report.name} · 7 extractors queued`)
    navigate(`/progress/${id}`)
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-10">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-2xl">
        <Card className="p-6">
          <Label htmlFor="file-input">SOC 1 PDF</Label>

          {!doc ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) selectFile(file)
              }}
              className={cx(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
                dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-300 bg-ink-50/60',
                submitted && !doc && 'border-red-400 bg-red-50/40',
              )}
            >
              <UploadIcon className="mb-2 h-6 w-6 text-ink-400" />
              <p className="text-[13.5px] font-medium text-ink-800">Drag a SOC 1 PDF here</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">or</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => inputRef.current?.click()}
              >
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
                  if (f) selectFile(f)
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
                  {doc.pages > 0 && doc.state !== 'invalid' && ` · ${doc.pages} pages`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(doc.state === 'standard' || doc.state === 'upload_failure') && (
                    <Badge tone="green">Text layer detected</Badge>
                  )}
                  {doc.state === 'protected' && (
                    <Badge tone="amber">
                      <LockIcon className="h-3 w-3" /> Password protected
                    </Badge>
                  )}
                  {doc.state === 'ocr' && <Badge tone="amber">Copy-locked · OCR required</Badge>}
                  {doc.state === 'invalid' && <Badge tone="red">Unsupported file type</Badge>}
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

          {submitted && !doc && <FieldError>Select a SOC 1 PDF to continue.</FieldError>}
          {fileError && <FieldError>{fileError}</FieldError>}

          {/* Only encrypted documents need a password, so only they ask for one. */}
          {doc?.state === 'protected' && (
            <div className="mt-4">
              <Label htmlFor="password">Document password</Label>
              <TextInput
                id="password"
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required to decrypt this document"
              />
              {submitted && passwordError && <FieldError>{passwordError}</FieldError>}
            </div>
          )}

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
            {doc && (
              <Button type="button" variant="ghost" onClick={clearDoc} disabled={uploading}>
                Clear
              </Button>
            )}
            {!doc && <span className="text-[12px] text-ink-500">Select a SOC 1 PDF to continue.</span>}
          </div>
        </Card>
      </form>
    </div>
  )
}
