// Registry of all app-email templates.
// Templates are stored as raw HTML in ../transactional-emails.ts (single source
// of truth). Each entry here exposes a React Email component that renders the
// substituted HTML — send-transactional-email calls `renderAsync(component)` to
// obtain the final HTML/plaintext.

import * as React from 'npm:react@18.3.1'
import { Body, Head, Html } from 'npm:@react-email/components@0.0.22'
import { TRANSACTIONAL_TEMPLATES } from '../transactional-emails.ts'
import { normalizeEmailSubject } from '../email-subjects.ts'

export interface TemplateEntry {
  component: React.ComponentType<Record<string, any>>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

function substitute(html: string, data: Record<string, any>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = data[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

// Wrap the stored raw HTML in a proper React Email Html/Head/Body tree so
// renderAsync emits a full <!doctype html> document. The stored template is a
// complete document; extract its inner <body> and inject it via
// dangerouslySetInnerHTML on the React Email <Body>.
function makeComponent(rawHtml: string) {
  return function EmailTemplate(props: Record<string, any> = {}) {
    const finalHtml = substitute(rawHtml, props)
    const bodyMatch = finalHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const inner = bodyMatch ? bodyMatch[1] : finalHtml
    return React.createElement(
      Html,
      { lang: 'en' },
      React.createElement(Head, null),
      React.createElement(Body, {
        dangerouslySetInnerHTML: { __html: inner },
      }),
    )
  }
}

const DEFAULT_PREVIEW_DATA: Record<string, string> = {
  acceptance_deadline: 'Friday, 30 August 2026',
  alert_reason: 'Repeatedly missed membership obligations',
  aod_date: 'Thursday, 12 September 2026',
  applications_deadline: 'Sunday, 15 September 2026',
  attendance_note: 'Registration is required before attending.',
  audience: 'Members and invited guests',
  body_paragraph_1: 'This is a preview paragraph for a system-generated communication.',
  body_paragraph_2: 'It is used to verify layout, subject rendering and link behaviour before sending.',
  body_paragraph_3: 'Please refer to the Workspace for any operational details.',
  call_description: 'A structured conversation with alumni on career paths and technical preparation.',
  closing_line: 'Thank you for your attention.',
  cta_label: 'Open the Workspace',
  cta_url: 'https://minervaims.org/auth',
  detail_label_1: 'Division',
  detail_label_2: 'Deadline',
  detail_value_1: 'Equity Research',
  detail_value_2: 'Sunday, 15 September 2026',
  division_name: 'Equity Research',
  division_or_team: 'Equity Research',
  division_slug: 'equity-research',
  due_date: 'Sunday, 15 September 2026',
  effective_date: 'Monday, 16 September 2026',
  event_date: 'Thursday, 12 September 2026',
  event_description: 'A technical session on public markets research and portfolio construction.',
  event_location: 'Bocconi University',
  event_moderator: 'Minerva IMS Board',
  event_speakers: 'Minerva IMS Alumni',
  event_summary: 'An academic discussion hosted by Minerva IMS.',
  event_time: '18:30',
  event_title: 'Market Research Forum',
  expulsion_reason: 'Repeatedly missed membership obligations',
  fee_amount: '€20',
  fee_deadline: 'Sunday, 15 September 2026',
  first_name: 'Jane',
  headline: 'Workspace update',
  payment_method: 'Bank transfer using the details provided in the Workspace',
  poster_block: '',
  poster_url: 'https://minervaims.org/__l5e/assets-v1/c3b55bfa-5266-4923-984e-74243ab40e3b/minerva-email-logo.png',
  president_name: 'President',
  preview_line: 'A preview of this Minerva IMS communication.',
  registration_note: 'Please register using the link below.',
  registration_url: 'https://minervaims.org/events',
  role_description: 'Responsibilities and access are defined in the Workspace.',
  role_name: 'Analyst',
  semester_label: 'Fall 2026',
  signoff_line_1: 'The Operations Team',
  signoff_line_2: 'Minerva IMS Workspace System',
  signoff_opener: 'Kind regards,',
  subject_line: 'Workspace update',
  task_name: 'Membership profile completion',
}

function resolveSubject(rawSubject: string, data: Record<string, any>): string {
  return normalizeEmailSubject(rawSubject, data)
}

const entries: Record<string, TemplateEntry> = {}
for (const t of TRANSACTIONAL_TEMPLATES) {
  entries[t.key] = {
    component: makeComponent(t.body),
    subject: (data: Record<string, any> = {}) => resolveSubject(t.subject, data),
    displayName: t.name,
    previewData: DEFAULT_PREVIEW_DATA,
  }
}

export const TEMPLATES: Record<string, TemplateEntry> = entries
