// Registry of all app-email templates.
// Templates are stored as raw HTML in ../transactional-emails.ts (single source
// of truth). Each entry here exposes a React Email component that renders the
// substituted HTML — send-transactional-email calls `renderAsync(component)` to
// obtain the final HTML/plaintext.

import * as React from 'npm:react@18.3.1'
import { TRANSACTIONAL_TEMPLATES } from '../transactional-emails.ts'

export interface TemplateEntry {
  // React component used by send-transactional-email + preview functions.
  component: React.ComponentType<Record<string, any>>
  // Subject line — static string or function of templateData.
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

// Substitute {{key}} tokens in the raw HTML with values from templateData.
function substitute(html: string, data: Record<string, any>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = data[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

// A minimal component that emits the pre-rendered raw HTML verbatim.
// React Email's renderAsync will wrap it inside its own React tree, so we
// return a fragment with the raw HTML injected via dangerouslySetInnerHTML on
// an <html> passthrough. The stored template body already contains a full
// <!DOCTYPE html>...<html>...</html> document; we render only its inner body
// content wrapped in a <div>, and rely on renderAsync's outer <html><body>
// wrapper for structure. Email clients strip nested <html>/<body>, so this
// yields a clean single document.
function makeComponent(rawHtml: string) {
  return function EmailTemplate(props: Record<string, any> = {}) {
    const finalHtml = substitute(rawHtml, props)
    // Extract inner body content if a full document was provided; otherwise
    // use as-is. This avoids nested <html> tags in the rendered output.
    const bodyMatch = finalHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const inner = bodyMatch ? bodyMatch[1] : finalHtml
    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: inner },
    })
  }
}

const entries: Record<string, TemplateEntry> = {}
for (const t of TRANSACTIONAL_TEMPLATES) {
  entries[t.key] = {
    component: makeComponent(t.body),
    subject: t.subject,
    displayName: t.name,
    previewData: {},
  }
}

export const TEMPLATES: Record<string, TemplateEntry> = entries
