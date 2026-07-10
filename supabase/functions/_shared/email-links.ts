const LINK_REPLACEMENTS: Array<[RegExp, string]> = [
  [/https:\/\/www\.linkedin\.com\/company\/minervaims\/?/g, 'https://it.linkedin.com/company/minerva-investment-management'],
]

export function normalizeEmailLinks(html: string): string {
  return LINK_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    html,
  )
}