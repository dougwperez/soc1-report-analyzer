import type { ExtractorId, ExtractorRun, Phase, User } from '../types'

export const users: User[] = [
  { id: 'u1', name: 'Dana Whitmore', initials: 'DW', email: 'dana.whitmore@example.com', role: 'Reviewer' },
  { id: 'u2', name: 'Priya Raghunathan', initials: 'PR', email: 'priya.raghunathan@example.com', role: 'Approver' },
  { id: 'u3', name: 'Marcus Bell', initials: 'MB', email: 'marcus.bell@example.com', role: 'Analyst' },
  { id: 'u4', name: 'Lena Ortiz', initials: 'LO', email: 'lena.ortiz@example.com', role: 'Reviewer' },
  { id: 'u5', name: 'Tomás Delgado', initials: 'TD', email: 'tomas.delgado@example.com', role: 'Read-only' },
  { id: 'u6', name: 'Ruth Ellery', initials: 'RE', email: 'ruth.ellery@example.com', role: 'Approver' },
]

export const userById = (id: string | null | undefined): User | undefined =>
  users.find((u) => u.id === id)

/** The signed-in reviewer for this mock session. */
export const CURRENT_USER_ID = 'u1'

export const applications: { name: string; serviceOrg: string }[] = [
  { name: 'Northwind PayCycle', serviceOrg: 'Northwind Payroll Services, Inc.' },
  { name: 'Calder Settlement Gateway', serviceOrg: 'Calder Trust Bank, N.A.' },
  { name: 'Ashfield TaxFile', serviceOrg: 'Ashfield Tax Solutions, Inc.' },
  { name: 'Meridian Cloud Platform', serviceOrg: 'Meridian Cloud Infrastructure, LLC' },
  { name: 'Ironvale Claims Engine', serviceOrg: 'Ironvale Benefit Administrators' },
  { name: 'Larkspur Fund Accounting', serviceOrg: 'Larkspur Fund Administration LLC' },
  { name: 'Sable Treasury Workstation', serviceOrg: 'Sable Financial Technologies' },
  { name: 'Kestrel Expense Manager', serviceOrg: 'Kestrel Software Group' },
  { name: 'Ambrose Custody Services', serviceOrg: 'Ambrose Trust Company' },
  { name: 'Bellweather Billing Hub', serviceOrg: 'Bellweather Revenue Systems' },
]

export const controlIds: { id: string; label: string }[] = [
  { id: 'FIN-PAY-014', label: 'Payroll expense completeness and accuracy' },
  { id: 'FIN-PAY-021', label: 'Payroll disbursement authorization' },
  { id: 'FIN-TAX-006', label: 'Payroll tax accrual and remittance' },
  { id: 'FIN-TRE-009', label: 'Cash settlement reconciliation' },
  { id: 'FIN-REV-031', label: 'Revenue billing accuracy' },
  { id: 'FIN-INV-018', label: 'Investment valuation and NAV review' },
  { id: 'ITGC-AC-002', label: 'Logical access provisioning and review' },
  { id: 'ITGC-CM-004', label: 'Program change management' },
]

/** Internal control library used by the CUEC mapping typeahead. */
export const internalControls: { id: string; title: string; owner: string; process: string }[] = [
  { id: 'PAY-C-101', title: 'Payroll master data change approval', owner: 'Alicia Fenn', process: 'Payroll' },
  { id: 'PAY-C-104', title: 'Pre-disbursement payroll register review', owner: 'Alicia Fenn', process: 'Payroll' },
  { id: 'PAY-C-107', title: 'Payroll GL account reconciliation', owner: 'Devon Shaw', process: 'Financial close' },
  { id: 'PAY-C-112', title: 'Authorized approver and banking change notification', owner: 'Devon Shaw', process: 'Treasury' },
  { id: 'ITGC-C-201', title: 'Application access provisioning approval', owner: 'Samuel Ijeoma', process: 'IT general controls' },
  { id: 'ITGC-C-205', title: 'Quarterly application access review', owner: 'Samuel Ijeoma', process: 'IT general controls' },
  { id: 'ITGC-C-208', title: 'Terminated user access removal', owner: 'Samuel Ijeoma', process: 'IT general controls' },
  { id: 'ITGC-C-214', title: 'Change management approval and testing', owner: 'Nadia Brant', process: 'IT general controls' },
  { id: 'FC-C-302', title: 'Manual journal entry review and approval', owner: 'Devon Shaw', process: 'Financial close' },
  { id: 'FC-C-311', title: 'Third-party service provider monitoring', owner: 'Rhea Kapoor', process: 'Vendor risk' },
  { id: 'TRE-C-402', title: 'Daily bank reconciliation review', owner: 'Marta Lindqvist', process: 'Treasury' },
]

export const phases: Phase[] = [
  {
    id: 'basic',
    label: 'Basic Procedures',
    shortLabel: 'Basics',
    description: 'Report metadata, period coverage, and the auditor’s opinion.',
  },
  {
    id: 'objectives',
    label: 'Control Objectives & Activities',
    shortLabel: 'Objectives',
    description: 'Each objective, the controls supporting it, and how they were tested.',
  },
  {
    id: 'exceptions',
    label: 'Exceptions',
    shortLabel: 'Exceptions',
    description: 'Testing exceptions, management responses, and financial reporting relevance.',
  },
  {
    id: 'cuecs',
    label: 'Complementary User Entity Controls',
    shortLabel: 'CUECs',
    description: 'Controls the service organization expects us to perform, mapped to our control library.',
  },
  {
    id: 'subservice',
    label: 'Subservice Organizations',
    shortLabel: 'Subservice',
    description: 'Downstream providers, inclusive or carved-out, and the evidence each one needs.',
  },
  {
    id: 'vendors',
    label: 'Vendors & Final Review',
    shortLabel: 'Final review',
    description: 'Vendor relevance decisions, outstanding items, and final approval.',
  },
]

export const phaseById = (id: string): Phase =>
  phases.find((p) => p.id === id) ?? phases[0]

export const extractorDefs: { id: ExtractorId; label: string; blurb: string; phase: string }[] = [
  { id: 'basic_procedures', label: 'Basic Procedures', blurb: 'Metadata, period, auditor opinion', phase: 'basic' },
  { id: 'control_objectives', label: 'Control Objectives', blurb: 'Objective numbers, titles, descriptions', phase: 'objectives' },
  { id: 'control_activities', label: 'Control Activities', blurb: 'Activities, testing performed, results', phase: 'objectives' },
  { id: 'exceptions', label: 'Exceptions', blurb: 'Testing exceptions and management responses', phase: 'exceptions' },
  { id: 'cuecs', label: 'Complementary User Entity Controls', blurb: 'Controls expected of the user entity', phase: 'cuecs' },
  { id: 'subservice_orgs', label: 'Subservice Organizations', blurb: 'Inclusive and carved-out providers', phase: 'subservice' },
  { id: 'vendors', label: 'Vendor / Service Providers', blurb: 'Third parties named in the description', phase: 'vendors' },
]

export function freshExtractors(): ExtractorRun[] {
  return extractorDefs.map((d) => ({
    id: d.id,
    label: d.label,
    blurb: d.blurb,
    status: 'pending' as const,
    progress: 0,
  }))
}

export function completedExtractors(counts: Partial<Record<ExtractorId, number>> = {}): ExtractorRun[] {
  return extractorDefs.map((d) => ({
    id: d.id,
    label: d.label,
    blurb: d.blurb,
    status: 'completed' as const,
    progress: 100,
    itemsFound: counts[d.id],
  }))
}
