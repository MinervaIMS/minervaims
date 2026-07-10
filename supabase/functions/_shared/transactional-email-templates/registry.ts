// Registry of all app-email templates.
// Templates are stored as raw HTML in ../transactional-emails.ts (single source
// of truth). Each entry here exposes a React Email component that renders the
// substituted HTML — send-transactional-email calls `renderAsync(component)` to
// obtain the final HTML/plaintext.

import * as React from 'npm:react@18.3.1'
import { Body, Head, Html } from 'npm:@react-email/components@0.0.22'
import { TRANSACTIONAL_TEMPLATES } from '../transactional-emails.ts'

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

const SUBJECT_SUFFIX = '| Minerva IMS'

function resolveSubject(rawSubject: string, data: Record<string, any>): string {
  let s = substitute(rawSubject, data)
  // Collapse whitespace introduced by empty placeholders
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+([:·,|-])/g, '$1').trim()
  if (!s.endsWith(SUBJECT_SUFFIX)) {
    s = s.length > 0 ? `${s} ${SUBJECT_SUFFIX}` : `Minerva IMS ${SUBJECT_SUFFIX}`
  }
  return s
}

const entries: Record<string, TemplateEntry> = {}
for (const t of TRANSACTIONAL_TEMPLATES) {
  entries[t.key] = {
    component: makeComponent(t.body),
    subject: (data: Record<string, any> = {}) => resolveSubject(t.subject, data),
    displayName: t.name,
    previewData: {},
  }
}

export const TEMPLATES: Record<string, TemplateEntry> = entries
