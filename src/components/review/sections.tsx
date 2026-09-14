import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Field, Report } from '../../types'
import FieldRow from './FieldRow'
import { Badge, Button, Callout, ChevronIcon, Card, PlusIcon } from '../ui'
import { internalControls } from '../../data/reference'
import { classNames as cx } from '../../lib/util'

/* Shared plumbing every section needs to talk back to the review page. */
export interface SectionCtx {
  report: Report
  readOnly: boolean
  activePath: string | null
  onSelect: (path: string, field: Field<string>, label: string) => void
  onEdit: (path: string, value: string) => void
  onConfirm: (path: string) => void
  onComment: (path: string, label: string) => void
  commentCountFor: (path: string) => number
}

function row(ctx: SectionCtx, path: string, label: string, field: Field<string>, extra: Partial<Parameters<typeof FieldRow>[0]> = {}) {
  return (
    <FieldRow
      key={path}
      path={path}
      label={label}
      field={field}
      readOnly={ctx.readOnly}
      active={ctx.activePath === path}
      commentCount={ctx.commentCountFor(path)}
      onSelect={ctx.onSelect}
      onEdit={ctx.onEdit}
      onConfirm={ctx.onConfirm}
      onComment={ctx.onComment}
      {...extra}
    />
  )
}

/* -------------------------------- collapsible ------------------------------- */

export function Collapsible({
  title,
  subtitle,
  badges,
  defaultOpen = false,
  children,
  tone,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  tone?: 'warning' | 'danger'
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card
      className={cx(
        'overflow-hidden',
        tone === 'danger' && 'border-red-200',
        tone === 'warning' && 'border-amber-200',
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cx(
          'flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-ink-50',
          tone === 'danger' && 'bg-red-50/60 hover:bg-red-50',
          tone === 'warning' && 'bg-amber-50/50 hover:bg-amber-50',
        )}
      >
        <ChevronIcon className={cx('mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform', open && 'rotate-90')} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink-900">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">{subtitle}</span>}
        </span>
        {badges && <span className="flex shrink-0 flex-wrap justify-end gap-1.5">{badges}</span>}
      </button>
      {open && <div className="border-t border-ink-100 py-1">{children}</div>}
    </Card>
  )
}

/* ------------------------------ basic procedures ---------------------------- */

export function BasicSection({ ctx }: { ctx: SectionCtx }) {
  const b = ctx.report.data!.basic
  return (
    <Card className="py-1">
      {row(ctx, 'basic.serviceOrganization', 'Service organization', b.serviceOrganization)}
      {row(ctx, 'basic.applicationName', 'Application name', b.applicationName)}
      {row(ctx, 'basic.controlId', 'Control ID', b.controlId)}
      {row(ctx, 'basic.reportType', 'Report type', b.reportType, {
        kind: 'select',
        options: ['SOC 1 Type 1', 'SOC 1 Type 2'],
      })}
      {row(ctx, 'basic.reportingPeriod', 'Reporting period', b.reportingPeriod)}
      {row(ctx, 'basic.auditorFirm', 'Auditor firm', b.auditorFirm)}
      {row(ctx, 'basic.auditorOpinion', 'Auditor opinion', b.auditorOpinion as Field<string>, {
        kind: 'select',
        options: ['Unqualified', 'Qualified', 'Adverse', 'Disclaimer'],
      })}
      {row(ctx, 'basic.auditorOpinionDate', 'Auditor opinion date', b.auditorOpinionDate)}
      {row(ctx, 'basic.locationsCovered', 'Locations covered', b.locationsCovered, { kind: 'textarea' })}
      {row(ctx, 'basic.reportingPeriodGaps', 'Reporting period gaps', b.reportingPeriodGaps, { kind: 'textarea' })}
      {row(ctx, 'basic.bridgeLetter', 'Bridge letter', b.bridgeLetter, { kind: 'textarea' })}
      {row(ctx, 'basic.conclusionOfReview', 'Conclusion of review', b.conclusionOfReview, {
        kind: 'textarea',
        placeholder: 'Summarise your conclusion on this report — required before approval.',
      })}
    </Card>
  )
}

/* --------------------------- objectives & activities ------------------------ */

export function ObjectivesSection({ ctx }: { ctx: SectionCtx }) {
  const objectives = ctx.report.data!.objectives
  return (
    <div className="flex flex-col gap-2.5">
      {objectives.map((o, i) => {
        const withExceptions = o.activities.filter((a) => a.exceptionRefs.length > 0)
        return (
          <Collapsible
            key={o.id}
            defaultOpen={i === 0}
            tone={withExceptions.length > 0 ? 'warning' : undefined}
            title={`Control Objective ${o.number.value} — ${o.title.value}`}
            subtitle={o.description.value}
            badges={
              <>
                <Badge tone="neutral">{o.activities.length} activities</Badge>
                {withExceptions.length > 0 ? (
                  <Badge tone="amber">{withExceptions.length} with exceptions</Badge>
                ) : (
                  <Badge tone="green">No exceptions</Badge>
                )}
                <Badge tone="neutral">p. {o.pageRefs.join(', ')}</Badge>
              </>
            }
          >
            {row(ctx, `objectives.${i}.number`, 'Objective number', o.number, { dense: true })}
            {row(ctx, `objectives.${i}.title`, 'Objective title', o.title, { dense: true })}
            {row(ctx, `objectives.${i}.description`, 'Objective description', o.description, { kind: 'textarea' })}

            <div className="mt-1 px-3.5 pb-1 pt-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-400">Control activities</p>
            </div>
            {o.activities.map((a, j) => (
              <div key={a.id} className="mx-3 mb-2 rounded-md border border-ink-200 bg-ink-50/50 py-1">
                <div className="flex items-center gap-2 px-3.5 py-1.5">
                  <span className="font-mono text-[12px] font-semibold text-ink-700">{a.ref}</span>
                  {a.exceptionRefs.length > 0 ? (
                    <Badge tone="amber">Exception {a.exceptionRefs.join(', ')}</Badge>
                  ) : (
                    <Badge tone="green">No exceptions noted</Badge>
                  )}
                </div>
                <div className="bg-white">
                  {row(ctx, `objectives.${i}.activities.${j}.description`, 'Control activity', a.description, {
                    kind: 'textarea',
                    dense: true,
                  })}
                  {row(ctx, `objectives.${i}.activities.${j}.testingPerformed`, 'Testing performed', a.testingPerformed, {
                    kind: 'textarea',
                    dense: true,
                  })}
                  {row(ctx, `objectives.${i}.activities.${j}.testResult`, 'Test result', a.testResult as Field<string>, {
                    kind: 'select',
                    options: ['No exceptions noted', 'Exceptions noted', 'Not tested'],
                    dense: true,
                  })}
                </div>
              </div>
            ))}
          </Collapsible>
        )
      })}
    </div>
  )
}

/* --------------------------------- exceptions ------------------------------- */

export function ExceptionsSection({ ctx }: { ctx: SectionCtx }) {
  const exceptions = ctx.report.data!.exceptions
  const contributing = exceptions.filter((e) => e.qualifiedOpinionImpact.value === 'Contributes to qualification')

  return (
    <div className="flex flex-col gap-2.5">
      <Callout tone="info" title="Exceptions are assessed individually">
        A report can carry testing exceptions and still receive an unqualified opinion. Assess each exception's
        relevance to financial reporting on its own facts, and only escalate the ones that warrant it.
        {contributing.length > 0 && (
          <>
            {' '}
            <strong>
              {contributing.length} exception{contributing.length > 1 ? 's' : ''} here contributed to a qualified
              opinion and require escalation.
            </strong>
          </>
        )}
      </Callout>

      {exceptions.map((e, i) => {
        const isQualifying = e.qualifiedOpinionImpact.value === 'Contributes to qualification'
        return (
          <Collapsible
            key={e.id}
            defaultOpen={isQualifying || i === 0}
            tone={isQualifying ? 'danger' : undefined}
            title={`${e.number.value} — ${e.relatedControl.value}`}
            subtitle={e.auditorTestResult.value}
            badges={
              <>
                {isQualifying && <Badge tone="red">Basis for qualification</Badge>}
                <Badge tone={e.financialReportingRelevance.value === 'Relevant' ? 'amber' : 'neutral'}>
                  {e.financialReportingRelevance.value}
                </Badge>
                <Badge tone={e.escalation.value === 'Not escalated' ? 'neutral' : 'indigo'}>{e.escalation.value}</Badge>
              </>
            }
          >
            {row(ctx, `exceptions.${i}.number`, 'Exception number', e.number, { dense: true })}
            {row(ctx, `exceptions.${i}.relatedControl`, 'Related control', e.relatedControl, { dense: true })}
            {row(ctx, `exceptions.${i}.auditorTestResult`, 'Auditor test result', e.auditorTestResult, { kind: 'textarea' })}
            {row(ctx, `exceptions.${i}.managementResponse`, 'Management response', e.managementResponse, { kind: 'textarea' })}
            {row(
              ctx,
              `exceptions.${i}.financialReportingRelevance`,
              'Financial reporting relevance',
              e.financialReportingRelevance as Field<string>,
              { kind: 'select', options: ['Relevant', 'Not relevant', 'Under assessment'] },
            )}
            {row(
              ctx,
              `exceptions.${i}.qualifiedOpinionImpact`,
              'Qualified opinion impact',
              e.qualifiedOpinionImpact as Field<string>,
              {
                kind: 'select',
                options: ['Contributes to qualification', 'No impact on opinion', 'Under assessment'],
              },
            )}
            {row(ctx, `exceptions.${i}.reviewerComments`, 'Reviewer comments', e.reviewerComments, {
              kind: 'textarea',
              placeholder: isQualifying
                ? 'Required — document the compensating control assessment and the impact on our control conclusion.'
                : 'Document your assessment of this exception.',
            })}
            {row(ctx, `exceptions.${i}.escalation`, 'Escalation status', e.escalation as Field<string>, {
              kind: 'select',
              options: ['Not escalated', 'Escalated to Controls Owner', 'Escalated to SOX PMO', 'Closed'],
            })}
            {isQualifying && !e.reviewerComments.value && (
              <div className="px-3.5 pb-2.5 pt-1">
                <Callout tone="warning" title="Reviewer comment required">
                  This exception is the basis for the qualified opinion. A documented assessment is required before the
                  report can be approved.
                </Callout>
              </div>
            )}
          </Collapsible>
        )
      })}
    </div>
  )
}

/* ------------------------------------ CUECs --------------------------------- */

export function CuecsSection({ ctx }: { ctx: SectionCtx }) {
  const cuecs = ctx.report.data!.cuecs
  const controlOptions = internalControls.map((c) => ({
    value: `${c.id} — ${c.title}`,
    label: `${c.id} — ${c.title}`,
    hint: `${c.process} · owner ${c.owner}`,
  }))
  const unmapped = cuecs.filter((c) => !c.mappedControl.value).length

  return (
    <div className="flex flex-col gap-2.5">
      <Callout tone="info" title="Complementary user entity controls are our responsibility">
        These are controls the service organization expects <em>us</em> to perform. Map each applicable CUEC to an
        internal control and confirm the owner — the mapping is a judgement call and is never applied automatically.
        {unmapped > 0 && <> {unmapped} CUEC{unmapped > 1 ? 's are' : ' is'} still unmapped.</>}
      </Callout>

      {cuecs.map((c, i) => {
        const mapped = !!c.mappedControl.value
        return (
          <Collapsible
            key={c.id}
            defaultOpen={i === 0}
            tone={!mapped ? 'warning' : undefined}
            title={`CUEC-${i + 1}`}
            subtitle={c.text.value}
            badges={
              <>
                <Badge tone={c.applicability.value === 'Applicable' ? 'indigo' : 'neutral'}>{c.applicability.value}</Badge>
                {mapped ? <Badge tone="green">Mapped</Badge> : <Badge tone="amber">Unmapped</Badge>}
                <Badge tone="neutral">{c.evidenceStatus.value}</Badge>
              </>
            }
          >
            {row(ctx, `cuecs.${i}.text`, 'Extracted CUEC text', c.text, { kind: 'textarea' })}
            {row(ctx, `cuecs.${i}.relatedObjective`, 'Related control objective', c.relatedObjective, { dense: true })}
            {row(ctx, `cuecs.${i}.applicability`, 'Applicability', c.applicability as Field<string>, {
              kind: 'select',
              options: ['Applicable', 'Not applicable', 'Under assessment'],
            })}
            {row(ctx, `cuecs.${i}.mappedControl`, 'Mapped internal control', c.mappedControl, {
              kind: 'typeahead',
              typeaheadOptions: controlOptions,
              placeholder: 'Search the internal control library…',
            })}
            {row(ctx, `cuecs.${i}.controlOwner`, 'Control owner', c.controlOwner, {
              dense: true,
              placeholder: 'Who performs this control?',
            })}
            {row(ctx, `cuecs.${i}.evidenceStatus`, 'Evidence status', c.evidenceStatus as Field<string>, {
              kind: 'select',
              options: ['Not started', 'Evidence requested', 'Evidence obtained', 'Not required'],
            })}
            {row(ctx, `cuecs.${i}.reviewerComments`, 'Reviewer comments', c.reviewerComments, { kind: 'textarea' })}
          </Collapsible>
        )
      })}
    </div>
  )
}

/* ------------------------------ subservice orgs ----------------------------- */

export function SubserviceSection({ ctx }: { ctx: SectionCtx }) {
  const orgs = ctx.report.data!.subservice
  return (
    <div className="flex flex-col gap-2.5">
      {orgs.map((s, i) => (
        <Collapsible
          key={s.id}
          defaultOpen={i === 0}
          title={s.name.value}
          subtitle={s.serviceCategory.value}
          badges={
            <>
              <Badge tone={s.designation.value === 'Carved-out' ? 'amber' : 'green'}>{s.designation.value}</Badge>
              <Badge tone={s.relevance.value === 'Relevant' ? 'indigo' : 'neutral'}>{s.relevance.value}</Badge>
              <Badge tone="neutral">p. {s.pageRefs.join(', ')}</Badge>
            </>
          }
        >
          {row(ctx, `subservice.${i}.name`, 'Organization name', s.name, { dense: true })}
          {row(ctx, `subservice.${i}.serviceCategory`, 'Service category', s.serviceCategory, { dense: true })}
          {row(ctx, `subservice.${i}.designation`, 'Designation', s.designation as Field<string>, {
            kind: 'select',
            options: ['Inclusive', 'Carved-out'],
          })}
          {row(ctx, `subservice.${i}.relevance`, 'Relevance', s.relevance as Field<string>, {
            kind: 'select',
            options: ['Relevant', 'Not relevant', 'Under assessment'],
          })}
          {row(ctx, `subservice.${i}.relatedObjectives`, 'Related control objectives', s.relatedObjectives, { dense: true })}
          {row(ctx, `subservice.${i}.additionalEvidence`, 'Additional evidence required', s.additionalEvidence, {
            kind: 'textarea',
          })}
          {row(ctx, `subservice.${i}.reviewerComments`, 'Reviewer comments', s.reviewerComments, { kind: 'textarea' })}
        </Collapsible>
      ))}
    </div>
  )
}

/* -------------------------------- vendors ----------------------------------- */

export function VendorsSection({ ctx, footer }: { ctx: SectionCtx; footer?: ReactNode }) {
  const vendors = ctx.report.data!.vendors
  const undetermined = vendors.filter((v) => !v.reviewerDetermination.value).length

  return (
    <div className="flex flex-col gap-2.5">
      {undetermined > 0 && (
        <Callout tone="warning" title={`${undetermined} vendor${undetermined > 1 ? 's' : ''} awaiting your determination`}>
          Record a determination for every vendor named in the system description before submitting the report.
        </Callout>
      )}

      {vendors.map((v, i) => (
        <Collapsible
          key={v.id}
          defaultOpen={i === 0}
          tone={!v.reviewerDetermination.value ? 'warning' : undefined}
          title={v.name.value}
          subtitle={v.serviceCategory.value}
          badges={
            <>
              <Badge tone={v.relevance.value === 'Relevant' ? 'indigo' : 'neutral'}>{v.relevance.value}</Badge>
              {v.reviewerDetermination.value ? (
                <Badge tone="green">Determined</Badge>
              ) : (
                <Badge tone="amber">Pending</Badge>
              )}
            </>
          }
        >
          {row(ctx, `vendors.${i}.name`, 'Vendor name', v.name, { dense: true })}
          {row(ctx, `vendors.${i}.serviceCategory`, 'Service category', v.serviceCategory, { dense: true })}
          {row(ctx, `vendors.${i}.relevance`, 'Relevance', v.relevance as Field<string>, {
            kind: 'select',
            options: ['Relevant', 'Not relevant', 'Under assessment'],
          })}
          {row(ctx, `vendors.${i}.reviewerDetermination`, 'Reviewer determination', v.reviewerDetermination, {
            kind: 'textarea',
            placeholder: 'Record whether this vendor is in scope for monitoring, and why.',
          })}
        </Collapsible>
      ))}

      {footer}
    </div>
  )
}

/* --------------------------- retry for failed sections ---------------------- */

export function FailedSectionNotice({
  label,
  error,
  onRetry,
  retrying,
}: {
  label: string
  error: string
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <Callout
      tone="error"
      title={`${label} could not be extracted`}
      action={
        <Button size="sm" variant="secondary" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Retry this section'}
        </Button>
      }
    >
      {error} Every other section was saved and is ready to review.
    </Callout>
  )
}

export function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      <PlusIcon className="h-3.5 w-3.5" /> {label}
    </Button>
  )
}
