export const MINERVA_SUBJECT_SUFFIX = ' | Minerva IMS'

function readPath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, data)
}

export function substituteSubjectPlaceholders(
  subject: string,
  data: Record<string, unknown> = {},
): string {
  return subject.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = readPath(data, key)
    return value === undefined || value === null ? '' : String(value)
  })
}

export function normalizeEmailSubject(
  subject: string | null | undefined,
  data: Record<string, unknown> = {},
  fallback = 'Notification',
): string {
  let base = substituteSubjectPlaceholders(String(subject ?? ''), data)

  base = base
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([:·,])/g, '$1')
    .replace(/(?:\s*\|\s*Minerva IMS\s*)+$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[:·,\-–—]\s*$/g, '')
    .trim()

  if (!base || /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(base)) base = fallback
  return `${base}${MINERVA_SUBJECT_SUFFIX}`
}

export function isLikelyBrokenSubject(subject: unknown, templateName?: unknown): boolean {
  if (typeof subject !== 'string') return true
  const value = subject.trim()
  if (!value) return true
  if (typeof templateName === 'string' && value === templateName.trim()) return true
  return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value)
}