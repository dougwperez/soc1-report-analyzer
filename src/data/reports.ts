import type {
  Field,
  Report,
  ReportData,
  SourceAnnotation,
} from '../types'
import { Q, QQ } from './pdfDocument'
import { completedExtractors, extractorDefs, freshExtractors } from './reference'

/* ----------------------------- field helpers ----------------------------- */

/** Deterministic pseudo-bounding-box so every citation has stable coordinates. */
function bboxFor(page: number, quote: string) {
  let h = 0
  for (let i = 0; i < quote.length; i++) h = (h * 31 + quote.charCodeAt(i)) >>> 0
  const y = 0.14 + ((h % 55) / 100)
  const height = Math.min(0.26, Math.max(0.028, quote.length / 2600))
  return {
    x: 0.108 + ((page % 3) * 0.004),
    y: Number(Math.min(y, 0.72).toFixed(4)),
    w: 0.784,
    h: Number(height.toFixed(4)),
  }
}

function src(page: number, quote: string, confidence: number): SourceAnnotation {
  return { page, quote, confidence, bbox: bboxFor(page, quote) }
}

/** Extracted from the document by a model. */
function ai<T>(value: T, source: SourceAnnotation | null = null): Field<T> {
  return { value, origin: 'ai', source }
}
/** Suggested from historical reviews — must be confirmed by a person. */
function rec<T>(value: T, rationale: string): Field<T> {
  return { value, origin: 'ai_recommendation', rationale, source: null, confirmed: false }
}
/** Carried over from last year's review — must be reconfirmed. */
function roll<T>(value: T, from: string): Field<T> {
  return { value, origin: 'rolled_forward', rolledFrom: from, source: null, confirmed: false }
}
/** Plain human input, no model involvement. */
function man<T>(value: T): Field<T> {
  return { value, origin: 'manual', source: null }
}

const PRIOR = 'Northwind PayCycle — FY2024 SOC 1 Type 2'

/* --------------------------- extracted payloads -------------------------- */

function objectives(): ReportData['objectives'] {
  return [
    {
      id: 'co-1',
      number: ai('1', src(11, Q.co1, 0.97)),
      title: ai('Data Input and Authorization', src(11, 'Control Objective 1 — Data Input and Authorization', 0.96)),
      description: ai(Q.co1, src(11, Q.co1, 0.97)),
      pageRefs: [11],
      activities: [
        {
          id: 'ca-1-1',
          ref: '1.1',
          description: ai(Q.ca11, src(11, Q.ca11, 0.95)),
          testingPerformed: ai(
            'For a sample of 40 master data changes, inspected the authorization record retained in the PayCycle portal.',
            src(11, 'For a sample of 40 master data changes, inspected the authorization record retained in the PayCycle portal.', 0.94),
          ),
          testResult: ai('No exceptions noted', src(11, 'No exceptions noted.', 0.99)),
          exceptionRefs: [],
        },
        {
          id: 'ca-1-2',
          ref: '1.2',
          description: ai(Q.ca12, src(11, Q.ca12, 0.93)),
          testingPerformed: ai(
            'For a sample of 25 days, inspected the exception report and evidence of supervisor clearance.',
            src(11, 'For a sample of 25 days, inspected the exception report and evidence of supervisor clearance.', 0.92),
          ),
          testResult: ai('No exceptions noted', src(11, 'No exceptions noted.', 0.98)),
          exceptionRefs: [],
        },
      ],
    },
    {
      id: 'co-2',
      number: ai('2', src(12, Q.co2, 0.97)),
      title: ai('Payroll Calculation', src(12, 'Control Objective 2 — Payroll Calculation', 0.96)),
      description: ai(Q.co2, src(12, Q.co2, 0.96)),
      pageRefs: [12],
      activities: [
        {
          id: 'ca-2-1',
          ref: '2.1',
          description: ai(Q.ca21, src(12, Q.ca21, 0.94)),
          testingPerformed: ai(
            'For a sample of 26 pay cycles, inspected the independent calculation comparison and evidence of variance resolution.',
            src(12, 'For a sample of 26 pay cycles, inspected the independent calculation comparison and evidence of variance resolution.', 0.93),
          ),
          testResult: ai('No exceptions noted', src(12, 'No exceptions noted.', 0.97)),
          exceptionRefs: [],
        },
        {
          id: 'ca-2-2',
          ref: '2.2',
          description: ai(Q.ca22, src(12, Q.ca22, 0.92)),
          testingPerformed: ai(
            'For a sample of 30 tax table updates, inspected evidence of analyst review prior to activation.',
            src(12, 'For a sample of 30 tax table updates, inspected evidence of analyst review prior to activation.', 0.91),
          ),
          testResult: ai('Exceptions noted', src(12, Q.ex3Result, 0.9)),
          exceptionRefs: ['EX-3'],
        },
      ],
    },
    {
      id: 'co-3',
      number: ai('3', src(13, Q.co3, 0.97)),
      title: ai('Disbursement', src(13, 'Control Objective 3 — Disbursement', 0.95)),
      description: ai(Q.co3, src(13, Q.co3, 0.96)),
      pageRefs: [13],
      activities: [
        {
          id: 'ca-3-1',
          ref: '3.1',
          description: ai(Q.ca31, src(13, Q.ca31, 0.95)),
          testingPerformed: ai(
            'For a sample of 30 disbursement files, inspected the control total and hash validation log.',
            src(13, 'For a sample of 30 disbursement files, inspected the control total and hash validation log.', 0.94),
          ),
          testResult: ai('No exceptions noted', src(13, 'No exceptions noted.', 0.97)),
          exceptionRefs: [],
        },
        {
          id: 'ca-3-2',
          ref: '3.2',
          description: ai(
            'Settlement confirmations received from Calder Trust Bank are reconciled to the disbursement register each business day by Treasury Operations.',
            src(13, 'Settlement confirmations received from Calder Trust Bank are reconciled to the disbursement register each business day by Treasury Operations.', 0.93),
          ),
          testingPerformed: ai(
            'For a sample of 25 business days, inspected the completed reconciliation and evidence of review.',
            src(13, 'For a sample of 25 business days, inspected the completed reconciliation and evidence of review.', 0.92),
          ),
          testResult: ai('No exceptions noted', src(13, 'No exceptions noted.', 0.97)),
          exceptionRefs: [],
        },
      ],
    },
    {
      id: 'co-4',
      number: ai('4', src(14, Q.co4, 0.97)),
      title: ai('Logical Access', src(14, 'Control Objective 4 — Logical Access', 0.96)),
      description: ai(Q.co4, src(14, Q.co4, 0.96)),
      pageRefs: [14],
      activities: [
        {
          id: 'ca-4-1',
          ref: '4.1',
          description: ai(Q.ca41, src(14, Q.ca41, 0.95)),
          testingPerformed: ai(Q.test41, src(14, Q.test41, 0.94)),
          testResult: ai('No exceptions noted', src(14, 'No exceptions noted.', 0.98)),
          exceptionRefs: [],
        },
        {
          id: 'ca-4-2',
          ref: '4.2',
          description: ai(Q.ca42, src(14, Q.ca42, 0.94)),
          testingPerformed: ai(
            'For all 4 quarterly user access reviews performed during the period, inspected the completed review and evidence of access removal.',
            src(14, 'For all 4 quarterly user access reviews performed during the period, inspected the completed review and evidence of access removal.', 0.93),
          ),
          testResult: ai('Exceptions noted', src(14, Q.ex1Result, 0.95)),
          exceptionRefs: ['EX-1'],
        },
      ],
    },
    {
      id: 'co-5',
      number: ai('5', src(15, Q.co5, 0.96)),
      title: ai('Change Management', src(15, 'Control Objective 5 — Change Management', 0.95)),
      description: ai(Q.co5, src(15, Q.co5, 0.96)),
      pageRefs: [15],
      activities: [
        {
          id: 'ca-5-1',
          ref: '5.1',
          description: ai(Q.ca51, src(15, Q.ca51, 0.94)),
          testingPerformed: ai(
            'For a sample of 40 program changes, inspected the change record, test evidence, and release manager approval.',
            src(15, 'For a sample of 40 program changes, inspected the change record, test evidence, and release manager approval.', 0.93),
          ),
          testResult: ai('Exceptions noted', src(15, Q.ex2Result, 0.91)),
          exceptionRefs: ['EX-2'],
        },
      ],
    },
  ]
}

function exceptions(): ReportData['exceptions'] {
  return [
    {
      id: 'ex-1',
      number: ai('EX-1', src(16, 'EX-1', 0.98)),
      relatedControl: ai('4.2 — Quarterly user access review', src(16, Q.ex1Result, 0.94)),
      auditorTestResult: ai(Q.ex1Result, src(16, Q.ex1Result, 0.96)),
      managementResponse: ai(Q.ex1Mgmt, src(17, Q.ex1Mgmt, 0.95)),
      financialReportingRelevance: rec(
        'Relevant',
        'Access review timeliness maps to ITGC-C-205, which supports FIN-PAY-014. Two prior reports with the same exception pattern were assessed as relevant.',
      ),
      qualifiedOpinionImpact: ai('No impact on opinion', src(16, 'The service auditor concluded that the exceptions noted above, individually and in the aggregate, did not prevent the related control objectives from being achieved.', 0.93)),
      reviewerComments: man(''),
      escalation: man('Not escalated'),
    },
    {
      id: 'ex-2',
      number: ai('EX-2', src(16, 'EX-2', 0.98)),
      relatedControl: ai('5.1 — Change management approval', src(16, Q.ex2Result, 0.93)),
      auditorTestResult: ai(Q.ex2Result, src(16, Q.ex2Result, 0.95)),
      managementResponse: ai(Q.ex2Mgmt, src(17, Q.ex2Mgmt, 0.94)),
      financialReportingRelevance: rec(
        'Not relevant',
        'The change was a report header update with no calculation impact. Comparable documentation-only exceptions were assessed as not relevant in FY2023 and FY2024.',
      ),
      qualifiedOpinionImpact: ai('No impact on opinion', src(16, 'The service auditor concluded that the exceptions noted above, individually and in the aggregate, did not prevent the related control objectives from being achieved.', 0.92)),
      reviewerComments: man(''),
      escalation: man('Not escalated'),
    },
    {
      id: 'ex-3',
      number: ai('EX-3', src(16, 'EX-3', 0.98)),
      relatedControl: ai('2.2 — Tax table update review', src(16, Q.ex3Result, 0.93)),
      auditorTestResult: ai(Q.ex3Result, src(16, Q.ex3Result, 0.95)),
      managementResponse: ai(Q.ex3Mgmt, src(17, Q.ex3Mgmt, 0.94)),
      financialReportingRelevance: man('Under assessment'),
      qualifiedOpinionImpact: ai('No impact on opinion', src(16, 'The service auditor concluded that the exceptions noted above, individually and in the aggregate, did not prevent the related control objectives from being achieved.', 0.92)),
      reviewerComments: man(''),
      escalation: man('Not escalated'),
    },
  ]
}

function cuecs(): ReportData['cuecs'] {
  return [
    {
      id: 'cuec-1',
      text: ai(Q.cuec1, src(9, Q.cuec1, 0.96)),
      relatedObjective: ai('Control Objective 1 — Data Input and Authorization', src(9, Q.cuec1, 0.88)),
      applicability: roll('Applicable', PRIOR),
      mappedControl: roll('PAY-C-101 — Payroll master data change approval', PRIOR),
      controlOwner: roll('Alicia Fenn', PRIOR),
      evidenceStatus: man('Not started'),
      reviewerComments: man(''),
    },
    {
      id: 'cuec-2',
      text: ai(Q.cuec2, src(9, Q.cuec2, 0.96)),
      relatedObjective: ai('Control Objective 3 — Disbursement', src(9, Q.cuec2, 0.86)),
      applicability: rec('Applicable', 'The register review is performed by Payroll Operations and was assessed as applicable in the FY2024 review of this report.'),
      mappedControl: rec(
        'PAY-C-104 — Pre-disbursement payroll register review',
        'Closest match in the control library by objective and wording. 3 prior reports mapped an equivalent CUEC to PAY-C-104.',
      ),
      controlOwner: rec('Alicia Fenn', 'Listed owner of PAY-C-104 in the control library.'),
      evidenceStatus: man('Not started'),
      reviewerComments: man(''),
    },
    {
      id: 'cuec-3',
      text: ai(Q.cuec3, src(9, Q.cuec3, 0.95)),
      relatedObjective: ai('Control Objective 4 — Logical Access', src(9, Q.cuec3, 0.9)),
      applicability: roll('Applicable', PRIOR),
      mappedControl: roll('ITGC-C-205 — Quarterly application access review', PRIOR),
      controlOwner: roll('Samuel Ijeoma', PRIOR),
      evidenceStatus: man('Evidence requested'),
      reviewerComments: man('Coordinate with IT GRC — the FY2025 access review evidence is in the ITGC binder.'),
    },
    {
      id: 'cuec-4',
      text: ai(Q.cuec4, src(10, Q.cuec4, 0.96)),
      relatedObjective: ai('Control Objective 2 — Payroll Calculation', src(10, Q.cuec4, 0.84)),
      applicability: man('Under assessment'),
      mappedControl: rec(
        'PAY-C-107 — Payroll GL account reconciliation',
        'Reconciliation of payroll expense and liability accounts is the stated purpose of PAY-C-107.',
      ),
      controlOwner: man(''),
      evidenceStatus: man('Not started'),
      reviewerComments: man(''),
    },
    {
      id: 'cuec-5',
      text: ai(Q.cuec5, src(10, Q.cuec5, 0.94)),
      relatedObjective: ai('Control Objective 3 — Disbursement', src(10, Q.cuec5, 0.82)),
      applicability: man('Under assessment'),
      mappedControl: man(''),
      controlOwner: man(''),
      evidenceStatus: man('Not started'),
      reviewerComments: man(''),
    },
  ]
}

function subservice(): ReportData['subservice'] {
  return [
    {
      id: 'sso-1',
      name: ai('Meridian Cloud Infrastructure, LLC', src(8, Q.subCarve, 0.97)),
      serviceCategory: ai('Data center hosting and managed infrastructure', src(8, Q.subCarve, 0.93)),
      designation: ai('Carved-out', src(8, 'Northwind applies the carve-out method; controls at Meridian are not included in the scope of this report.', 0.96)),
      relevance: roll('Relevant', PRIOR),
      relatedObjectives: ai('Control Objectives 4 and 5', src(8, Q.subCarve, 0.79)),
      additionalEvidence: roll('Obtain and review the Meridian SOC 2 Type 2 report covering the same period.', PRIOR),
      reviewerComments: man(''),
      pageRefs: [3, 8],
    },
    {
      id: 'sso-2',
      name: ai('Calder Trust Bank, N.A.', src(8, Q.subInclusive, 0.97)),
      serviceCategory: ai('Payroll disbursement and settlement services', src(8, Q.subInclusive, 0.94)),
      designation: ai('Inclusive', src(8, 'The inclusive method has been applied and Calder Trust Bank controls are presented in Section IV.', 0.96)),
      relevance: ai('Relevant', src(13, Q.co3, 0.85)),
      relatedObjectives: ai('Control Objective 3 — Disbursement', src(13, Q.co3, 0.88)),
      additionalEvidence: man('None — inclusive scope, controls tested within this report.'),
      reviewerComments: man(''),
      pageRefs: [3, 8, 13],
    },
    {
      id: 'sso-3',
      name: ai('Ashfield Tax Solutions, Inc.', src(8, Q.subTaxCarve, 0.95)),
      serviceCategory: ai('Payroll tax filing and remittance', src(8, Q.subTaxCarve, 0.93)),
      designation: ai('Carved-out', src(8, Q.subTaxCarve, 0.95)),
      relevance: man('Under assessment'),
      relatedObjectives: ai('Control Objective 2 — Payroll Calculation', src(12, Q.co2, 0.72)),
      additionalEvidence: rec(
        'Request the Ashfield SOC 1 Type 2 report and assess the period covered against ours.',
        'Carved-out subservice organizations supporting a financially relevant objective required a downstream SOC report in 4 of the last 5 reviews.',
      ),
      reviewerComments: man(''),
      pageRefs: [8],
    },
  ]
}

function vendors(): ReportData['vendors'] {
  return [
    {
      id: 'v-1',
      name: ai('Meridian Cloud Infrastructure, LLC', src(10, Q.vendor1, 0.96)),
      serviceCategory: ai('Data center hosting and managed infrastructure', src(10, Q.vendor1, 0.93)),
      relevance: roll('Relevant', PRIOR),
      reviewerDetermination: roll('In scope for vendor risk monitoring; SOC 2 obtained annually.', PRIOR),
    },
    {
      id: 'v-2',
      name: ai('Calder Trust Bank, N.A.', src(10, Q.vendor2, 0.96)),
      serviceCategory: ai('Payroll settlement and disbursement', src(10, Q.vendor2, 0.94)),
      relevance: roll('Relevant', PRIOR),
      reviewerDetermination: roll('In scope; settlement controls tested inclusively within this report.', PRIOR),
    },
    {
      id: 'v-3',
      name: ai('Ashfield Tax Solutions, Inc.', src(10, Q.vendor3, 0.95)),
      serviceCategory: ai('Payroll tax filing and remittance', src(10, Q.vendor3, 0.93)),
      relevance: man('Under assessment'),
      reviewerDetermination: man(''),
    },
    {
      id: 'v-4',
      name: ai('Halloway Print & Mail Services, LLC', src(10, Q.vendor4, 0.94)),
      serviceCategory: ai('Pay statement printing and distribution', src(10, Q.vendor4, 0.92)),
      relevance: rec('Not relevant', 'Print and mail services do not affect payroll amounts recorded in the general ledger. Assessed as not relevant in FY2023 and FY2024.'),
      reviewerDetermination: man(''),
    },
    {
      id: 'v-5',
      name: ai('Verity Identity Systems, Inc.', src(10, Q.vendor5, 0.93)),
      serviceCategory: ai('Multi-factor authentication services', src(10, Q.vendor5, 0.91)),
      relevance: rec('Relevant', 'Authentication supports logical access controls under ITGC-AC-002, which is financially relevant.'),
      reviewerDetermination: man(''),
    },
  ]
}

export function standardData(): ReportData {
  return {
    basic: {
      serviceOrganization: ai('Northwind Payroll Services, Inc.', src(3, Q.serviceOrg, 0.98)),
      applicationName: ai('Northwind PayCycle', src(3, Q.application, 0.97)),
      controlId: man('FIN-PAY-014'),
      reportType: ai('SOC 1 Type 2', src(1, Q.reportType, 0.99)),
      reportingPeriod: ai('October 1, 2024 – September 30, 2025', src(3, Q.period, 0.98)),
      auditorFirm: ai('Braddock & Whitfield LLP', src(5, Q.auditorFirm, 0.97)),
      auditorOpinion: ai('Unqualified', src(5, Q.opinion, 0.96)),
      auditorOpinionDate: ai('November 14, 2025', src(5, Q.opinionDate, 0.95)),
      locationsCovered: ai('Portland, Oregon; Columbus, Ohio; Reno, Nevada (DR)', src(3, Q.locations, 0.93)),
      conclusionOfReview: man(''),
      reportingPeriodGaps: ai('No gap — prior report covered October 1, 2023 to September 30, 2024.', src(6, Q.gapNote, 0.91)),
      bridgeLetter: ai('Bridge letter available covering October 1, 2025 – December 31, 2025.', src(18, Q.bridge, 0.9)),
    },
    objectives: objectives(),
    exceptions: exceptions(),
    cuecs: cuecs(),
    subservice: subservice(),
    vendors: vendors(),
  }
}

export function qualifiedData(): ReportData {
  const d = standardData()
  d.basic.auditorOpinion = ai('Qualified', src(5, QQ.opinion, 0.97))
  d.basic.auditorOpinionDate = ai('December 2, 2025', src(5, QQ.opinionDate, 0.94))
  d.basic.conclusionOfReview = man('')
  // The disbursement control failed for part of the period, so objective 3 was not achieved.
  d.objectives[2].activities[0].testResult = ai('Exceptions noted', src(16, QQ.ex4Result, 0.96))
  d.objectives[2].activities[0].exceptionRefs = ['EX-4']
  d.exceptions.push({
    id: 'ex-4',
    number: ai('EX-4', src(16, 'EX-4', 0.98)),
    relatedControl: ai('3.1 — Disbursement file control total and hash validation', src(16, QQ.ex4Result, 0.95)),
    auditorTestResult: ai(QQ.ex4Result, src(16, QQ.ex4Result, 0.97)),
    managementResponse: ai(QQ.ex4Mgmt, src(17, QQ.ex4Mgmt, 0.94)),
    financialReportingRelevance: ai('Relevant', src(5, QQ.basis, 0.95)),
    qualifiedOpinionImpact: ai('Contributes to qualification', src(5, QQ.basis, 0.97)),
    reviewerComments: man(''),
    escalation: man('Not escalated'),
  })
  return d
}

/* ------------------------------ seed reports ----------------------------- */

const iso = (s: string) => new Date(s).toISOString()

function baseReport(partial: Partial<Report> & Pick<Report, 'id' | 'name'>): Report {
  return {
    serviceOrganization: 'Northwind Payroll Services, Inc.',
    application: 'Northwind PayCycle',
    controlId: 'FIN-PAY-014',
    reportType: 'SOC 1 Type 2',
    documentId: 'standard',
    periodStart: '2024-10-01',
    periodEnd: '2025-09-30',
    periodLabel: 'Oct 1, 2024 – Sep 30, 2025',
    auditorFirm: 'Braddock & Whitfield LLP',
    extractionStatus: 'completed',
    reviewStatus: 'ready_for_review',
    createdById: 'u3',
    assignedReviewerId: 'u1',
    watcherIds: ['u2'],
    createdAt: iso('2025-11-18T09:12:00'),
    updatedAt: iso('2025-11-18T09:34:00'),
    qualified: false,
    extractors: completedExtractors(),
    data: null,
    verifications: {},
    comments: [],
    audit: [],
    ...partial,
  }
}

export function seedReports(): Report[] {
  return [
    baseReport({
      id: 'RPT-2041',
      name: 'Northwind PayCycle — FY2025 SOC 1 Type 2',
      priorReportName: PRIOR,
      data: standardData(),
      extractors: completedExtractors({
        control_objectives: 5,
        control_activities: 8,
        exceptions: 3,
        cuecs: 5,
        subservice_orgs: 3,
        vendors: 5,
      }),
      comments: [
        {
          id: 'th-1',
          phase: 'exceptions',
          anchorPath: 'exceptions.0.financialReportingRelevance',
          anchorLabel: 'EX-1 · Financial reporting relevance',
          resolved: false,
          entries: [
            {
              id: 'c-1',
              authorId: 'u3',
              body: 'The FY2024 review treated a late access review as relevant to FIN-PAY-014. Flagging so we stay consistent.',
              createdAt: iso('2025-11-18T10:02:00'),
            },
          ],
        },
        {
          id: 'th-2',
          phase: 'basic',
          anchorPath: 'basic.reportingPeriodGaps',
          anchorLabel: 'Reporting period gaps',
          resolved: true,
          resolvedBy: 'u1',
          resolvedAt: iso('2025-11-18T10:20:00'),
          entries: [
            {
              id: 'c-2',
              authorId: 'u2',
              body: 'Confirm there is no coverage gap against our fiscal year end.',
              createdAt: iso('2025-11-18T09:58:00'),
            },
            {
              id: 'c-3',
              authorId: 'u1',
              body: 'Confirmed — periods are contiguous and the bridge letter covers us through Dec 31.',
              createdAt: iso('2025-11-18T10:19:00'),
            },
          ],
        },
      ],
      audit: [
        { id: 'a-1', at: iso('2025-11-18T09:12:00'), userId: 'u3', summary: 'Uploaded SOC 1 report and started extraction' },
        { id: 'a-2', at: iso('2025-11-18T09:34:00'), userId: 'u3', summary: 'Extraction completed — 7 of 7 extractors succeeded' },
        { id: 'a-3', at: iso('2025-11-18T09:35:00'), userId: 'u3', summary: 'Assigned Dana Whitmore as reviewer' },
      ],
    }),
    baseReport({
      id: 'RPT-2038',
      name: 'Northwind PayCycle — FY2025 SOC 1 Type 2 (Reissued)',
      documentId: 'qualified',
      qualified: true,
      reviewStatus: 'in_review',
      auditorFirm: 'Braddock & Whitfield LLP',
      createdById: 'u4',
      assignedReviewerId: 'u1',
      watcherIds: ['u2', 'u6'],
      createdAt: iso('2025-12-03T13:40:00'),
      updatedAt: iso('2025-12-04T08:15:00'),
      priorReportName: PRIOR,
      data: qualifiedData(),
      extractors: completedExtractors({
        control_objectives: 5,
        control_activities: 8,
        exceptions: 4,
        cuecs: 5,
        subservice_orgs: 3,
        vendors: 5,
      }),
      comments: [
        {
          id: 'th-3',
          phase: 'exceptions',
          anchorPath: 'exceptions.3.auditorTestResult',
          anchorLabel: 'EX-4 · Auditor test result',
          resolved: false,
          entries: [
            {
              id: 'c-4',
              authorId: 'u2',
              body: 'This is the basis for the qualification. We need a documented compensating-control assessment before this can be approved.',
              createdAt: iso('2025-12-03T16:20:00'),
            },
          ],
        },
      ],
      audit: [
        { id: 'a-4', at: iso('2025-12-03T13:40:00'), userId: 'u4', summary: 'Uploaded reissued SOC 1 report and started extraction' },
        { id: 'a-5', at: iso('2025-12-03T14:05:00'), userId: 'u4', summary: 'Extraction completed — qualified opinion detected' },
      ],
    }),
    baseReport({
      id: 'RPT-2035',
      name: 'Larkspur Fund Accounting — FY2025 SOC 1 Type 2',
      serviceOrganization: 'Larkspur Fund Administration LLC',
      application: 'Larkspur Fund Accounting',
      controlId: 'FIN-INV-018',
      auditorFirm: 'Renshaw Coyle LLP',
      reviewStatus: 'approved',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
      periodLabel: 'Jul 1, 2024 – Jun 30, 2025',
      createdById: 'u4',
      assignedReviewerId: 'u4',
      watcherIds: ['u1'],
      createdAt: iso('2025-09-08T11:05:00'),
      updatedAt: iso('2025-10-01T15:22:00'),
      data: standardData(),
      verifications: {
        basic: { userId: 'u4', at: iso('2025-09-22T10:00:00') },
        objectives: { userId: 'u4', at: iso('2025-09-24T11:30:00') },
        exceptions: { userId: 'u4', at: iso('2025-09-25T09:15:00') },
        cuecs: { userId: 'u4', at: iso('2025-09-26T14:40:00') },
        subservice: { userId: 'u4', at: iso('2025-09-29T10:05:00') },
        vendors: { userId: 'u4', at: iso('2025-09-30T16:20:00') },
      },
      audit: [
        { id: 'a-6', at: iso('2025-09-08T11:05:00'), userId: 'u4', summary: 'Uploaded SOC 1 report and started extraction' },
        { id: 'a-7', at: iso('2025-10-01T15:22:00'), userId: 'u2', summary: 'Approved report' },
      ],
    }),
    baseReport({
      id: 'RPT-2033',
      name: 'Ironvale Claims Engine — FY2025 SOC 1 Type 2',
      serviceOrganization: 'Ironvale Benefit Administrators',
      application: 'Ironvale Claims Engine',
      controlId: 'FIN-REV-031',
      auditorFirm: 'Halbrook Nyman LLP',
      reviewStatus: 'changes_requested',
      periodStart: '2024-10-01',
      periodEnd: '2025-09-30',
      createdById: 'u3',
      assignedReviewerId: 'u1',
      watcherIds: ['u2'],
      createdAt: iso('2025-11-02T08:44:00'),
      updatedAt: iso('2025-11-27T17:03:00'),
      data: standardData(),
      verifications: {
        basic: { userId: 'u1', at: iso('2025-11-10T09:00:00') },
        objectives: { userId: 'u1', at: iso('2025-11-12T13:20:00') },
      },
      comments: [
        {
          id: 'th-4',
          phase: 'cuecs',
          anchorLabel: 'CUEC mapping completeness',
          resolved: false,
          entries: [
            {
              id: 'c-5',
              authorId: 'u2',
              body: 'Two CUECs are still unmapped. Please complete the mapping and re-submit.',
              createdAt: iso('2025-11-27T17:02:00'),
            },
          ],
        },
      ],
      audit: [
        { id: 'a-8', at: iso('2025-11-27T17:03:00'), userId: 'u2', summary: 'Requested changes — CUEC mapping incomplete' },
      ],
    }),
    baseReport({
      id: 'RPT-2030',
      name: 'Sable Treasury Workstation — FY2025 SOC 1 Type 2',
      serviceOrganization: 'Sable Financial Technologies',
      application: 'Sable Treasury Workstation',
      controlId: 'FIN-TRE-009',
      auditorFirm: 'Braddock & Whitfield LLP',
      extractionStatus: 'partial',
      reviewStatus: 'ready_for_review',
      createdById: 'u1',
      assignedReviewerId: 'u1',
      watcherIds: [],
      createdAt: iso('2025-11-25T14:20:00'),
      updatedAt: iso('2025-11-25T14:48:00'),
      data: { ...standardData(), cuecs: [] },
      extractors: extractorDefs.map((d) =>
        d.id === 'cuecs'
          ? {
              id: d.id,
              label: d.label,
              blurb: d.blurb,
              status: 'failed' as const,
              progress: 62,
              error: 'Structured output failed schema validation: 3 of 6 CUEC objects were missing the required "related_objective" field.',
              retryable: true,
            }
          : { id: d.id, label: d.label, blurb: d.blurb, status: 'completed' as const, progress: 100 },
      ),
      audit: [
        { id: 'a-9', at: iso('2025-11-25T14:48:00'), userId: 'u1', summary: 'Extraction completed with 1 failed extractor (CUECs)' },
      ],
    }),
    baseReport({
      id: 'RPT-2028',
      name: 'Ashfield TaxFile — FY2025 SOC 1 Type 2',
      serviceOrganization: 'Ashfield Tax Solutions, Inc.',
      application: 'Ashfield TaxFile',
      controlId: 'FIN-TAX-006',
      auditorFirm: 'Renshaw Coyle LLP',
      extractionStatus: 'failed',
      reviewStatus: 'not_started',
      createdById: 'u3',
      assignedReviewerId: null,
      watcherIds: [],
      createdAt: iso('2025-11-21T16:02:00'),
      updatedAt: iso('2025-11-21T16:09:00'),
      data: null,
      extractors: freshExtractors().map((e) => ({
        ...e,
        status: 'failed' as const,
        error: 'Text layer could not be extracted. The document is copy-locked and OCR did not reach the required confidence threshold.',
        retryable: true,
      })),
      audit: [
        { id: 'a-10', at: iso('2025-11-21T16:09:00'), userId: 'u3', summary: 'Extraction failed — OCR confidence below threshold' },
      ],
    }),
    baseReport({
      id: 'RPT-2026',
      name: 'Kestrel Expense Manager — FY2025 SOC 1 Type 2',
      serviceOrganization: 'Kestrel Software Group',
      application: 'Kestrel Expense Manager',
      controlId: 'FIN-REV-031',
      auditorFirm: 'Halbrook Nyman LLP',
      extractionStatus: 'processing',
      reviewStatus: 'not_started',
      createdById: 'u4',
      assignedReviewerId: null,
      watcherIds: [],
      createdAt: iso('2025-12-04T09:30:00'),
      updatedAt: iso('2025-12-04T09:31:00'),
      data: null,
      extractors: freshExtractors().map((e, i) => ({
        ...e,
        status: i < 3 ? ('completed' as const) : i === 3 ? ('running' as const) : ('pending' as const),
        progress: i < 3 ? 100 : i === 3 ? 45 : 0,
      })),
      audit: [
        { id: 'a-11', at: iso('2025-12-04T09:30:00'), userId: 'u4', summary: 'Uploaded SOC 1 report and started extraction' },
      ],
    }),
    baseReport({
      id: 'RPT-2019',
      name: 'Ambrose Custody Services — FY2024 SOC 1 Type 2',
      serviceOrganization: 'Ambrose Trust Company',
      application: 'Ambrose Custody Services',
      controlId: 'FIN-INV-018',
      auditorFirm: 'Renshaw Coyle LLP',
      reviewStatus: 'approved',
      periodStart: '2023-10-01',
      periodEnd: '2024-09-30',
      periodLabel: 'Oct 1, 2023 – Sep 30, 2024',
      createdById: 'u1',
      assignedReviewerId: 'u1',
      watcherIds: ['u6'],
      createdAt: iso('2024-11-14T10:15:00'),
      updatedAt: iso('2024-12-20T12:00:00'),
      data: standardData(),
      verifications: {
        basic: { userId: 'u1', at: iso('2024-11-20T10:00:00') },
        objectives: { userId: 'u1', at: iso('2024-11-22T10:00:00') },
        exceptions: { userId: 'u1', at: iso('2024-11-25T10:00:00') },
        cuecs: { userId: 'u1', at: iso('2024-12-02T10:00:00') },
        subservice: { userId: 'u1', at: iso('2024-12-05T10:00:00') },
        vendors: { userId: 'u1', at: iso('2024-12-18T10:00:00') },
      },
      audit: [
        { id: 'a-12', at: iso('2024-12-20T12:00:00'), userId: 'u6', summary: 'Approved report' },
      ],
    }),
    baseReport({
      id: 'RPT-2014',
      name: 'Bellweather Billing Hub — FY2024 SOC 1 Type 2',
      serviceOrganization: 'Bellweather Revenue Systems',
      application: 'Bellweather Billing Hub',
      controlId: 'FIN-REV-031',
      auditorFirm: 'Braddock & Whitfield LLP',
      reportType: 'SOC 1 Type 1',
      reviewStatus: 'ready_for_review',
      periodStart: '2024-06-30',
      periodEnd: '2024-06-30',
      periodLabel: 'As of Jun 30, 2024',
      createdById: 'u5',
      assignedReviewerId: 'u4',
      watcherIds: [],
      createdAt: iso('2024-08-19T15:45:00'),
      updatedAt: iso('2024-08-19T16:10:00'),
      data: standardData(),
    }),
  ]
}
