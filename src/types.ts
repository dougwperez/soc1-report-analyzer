/* ------------------------------------------------------------------ *
 * Domain types for the SOC 1 Report Analyzer mock.
 * Everything here is fictional sample data — no real client content.
 * ------------------------------------------------------------------ */

export type ExtractorId =
  | 'basic_procedures'
  | 'control_objectives'
  | 'control_activities'
  | 'exceptions'
  | 'cuecs'
  | 'subservice_orgs'
  | 'vendors'

export type ExtractorStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ExtractorRun {
  id: ExtractorId
  label: string
  /** What this extractor pulls out of the PDF — shown in the progress UI. */
  blurb: string
  status: ExtractorStatus
  /** 0–100 within this extractor. */
  progress: number
  startedAt?: number
  finishedAt?: number
  itemsFound?: number
  error?: string
  /** Set when the failure is recoverable by re-running just this extractor. */
  retryable?: boolean
}

export type ExtractionStatus = 'queued' | 'processing' | 'completed' | 'partial' | 'failed'
export type ReviewStatus =
  | 'not_started'
  | 'ready_for_review'
  | 'in_review'
  | 'pending_approval'
  | 'changes_requested'
  | 'approved'

export type PhaseId =
  | 'basic'
  | 'objectives'
  | 'exceptions'
  | 'cuecs'
  | 'subservice'
  | 'vendors'

export interface Phase {
  id: PhaseId
  label: string
  shortLabel: string
  description: string
}

/* ---------------------------- source evidence ---------------------------- */

export interface SourceAnnotation {
  /** 1-indexed page in the source PDF. */
  page: number
  /** Verbatim text the model matched on. */
  quote: string
  /** Normalized to the page box, origin top-left. */
  bbox: { x: number; y: number; w: number; h: number }
  /** 0–1 match confidence reported by the extractor. */
  confidence: number
}

export type FieldOrigin =
  /** Extracted from the PDF by a model. */
  | 'ai'
  /** Suggested from historical reviews — needs human confirmation. */
  | 'ai_recommendation'
  /** Carried over from the prior-year report — needs reconfirmation. */
  | 'rolled_forward'
  /** Entered by a person, no model involvement. */
  | 'manual'

export interface Field<T = string> {
  value: T
  origin: FieldOrigin
  source?: SourceAnnotation | null
  /** A reviewer changed the extracted value. */
  edited?: boolean
  editedBy?: string
  editedAt?: string
  /** A reviewer explicitly confirmed the value (required for recommendations/roll-forwards). */
  confirmed?: boolean
  confirmedBy?: string
  /** Report name the value was rolled forward from. */
  rolledFrom?: string
  /** Why the model suggested this — shown behind a disclosure on recommendations. */
  rationale?: string
}

/* ----------------------------- extracted data ---------------------------- */

export interface BasicProcedures {
  serviceOrganization: Field
  applicationName: Field
  controlId: Field
  reportType: Field
  reportingPeriod: Field
  auditorFirm: Field
  auditorOpinion: Field<'Unqualified' | 'Qualified' | 'Adverse' | 'Disclaimer'>
  auditorOpinionDate: Field
  locationsCovered: Field
  conclusionOfReview: Field
  reportingPeriodGaps: Field
  bridgeLetter: Field
}

export interface ControlActivity {
  id: string
  ref: string
  description: Field
  testingPerformed: Field
  testResult: Field<'No exceptions noted' | 'Exceptions noted' | 'Not tested'>
  exceptionRefs: string[]
}

export interface ControlObjective {
  id: string
  number: Field
  title: Field
  description: Field
  activities: ControlActivity[]
  pageRefs: number[]
}

export interface ExceptionItem {
  id: string
  number: Field
  relatedControl: Field
  auditorTestResult: Field
  managementResponse: Field
  financialReportingRelevance: Field<'Relevant' | 'Not relevant' | 'Under assessment'>
  qualifiedOpinionImpact: Field<'Contributes to qualification' | 'No impact on opinion' | 'Under assessment'>
  reviewerComments: Field
  escalation: Field<'Not escalated' | 'Escalated to Controls Owner' | 'Escalated to SOX PMO' | 'Closed'>
}

export interface Cuec {
  id: string
  text: Field
  relatedObjective: Field
  applicability: Field<'Applicable' | 'Not applicable' | 'Under assessment'>
  mappedControl: Field
  controlOwner: Field
  evidenceStatus: Field<'Evidence obtained' | 'Evidence requested' | 'Not started' | 'Not required'>
  reviewerComments: Field
}

export interface SubserviceOrg {
  id: string
  name: Field
  serviceCategory: Field
  designation: Field<'Inclusive' | 'Carved-out'>
  relevance: Field<'Relevant' | 'Not relevant' | 'Under assessment'>
  relatedObjectives: Field
  additionalEvidence: Field
  reviewerComments: Field
  pageRefs: number[]
}

export interface Vendor {
  id: string
  name: Field
  serviceCategory: Field
  relevance: Field<'Relevant' | 'Not relevant' | 'Under assessment'>
  reviewerDetermination: Field
}

export interface ReportData {
  basic: BasicProcedures
  objectives: ControlObjective[]
  exceptions: ExceptionItem[]
  cuecs: Cuec[]
  subservice: SubserviceOrg[]
  vendors: Vendor[]
}

/* ------------------------- collaboration & review ------------------------ */

export interface User {
  id: string
  name: string
  initials: string
  email: string
  role: 'Reviewer' | 'Approver' | 'Analyst' | 'Read-only'
}

export interface CommentEntry {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface CommentThread {
  id: string
  phase: PhaseId
  /** Dotted path of the field the thread is anchored to, when applicable. */
  anchorPath?: string
  anchorLabel: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  entries: CommentEntry[]
}

export interface Verification {
  userId: string
  at: string
}

export interface AuditEvent {
  id: string
  at: string
  userId: string
  summary: string
}

export interface Report {
  id: string
  name: string
  serviceOrganization: string
  application: string
  controlId: string
  reportType: 'SOC 1 Type 2' | 'SOC 1 Type 1'
  documentId: 'standard' | 'qualified'
  /** Drives which simulated extraction path the progress screen runs. */
  scenario?: 'standard' | 'qualified' | 'partial' | 'ocr_fail'
  /** Filename of the uploaded document, shown throughout the review. */
  fileName?: string
  periodStart: string
  periodEnd: string
  periodLabel: string
  auditorFirm: string
  extractionStatus: ExtractionStatus
  reviewStatus: ReviewStatus
  createdById: string
  assignedReviewerId: string | null
  watcherIds: string[]
  createdAt: string
  updatedAt: string
  /** Auditor issued a qualified opinion, or findings warrant the qualified workflow. */
  qualified: boolean
  extractors: ExtractorRun[]
  data: ReportData | null
  verifications: Partial<Record<PhaseId, Verification>>
  comments: CommentThread[]
  audit: AuditEvent[]
  /** Report the roll-forward values came from. */
  priorReportName?: string
  /** Populated on the export-failure demo path. */
  exportedSheetUrl?: string
}

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info' | 'slack'
  title: string
  body?: string
}
