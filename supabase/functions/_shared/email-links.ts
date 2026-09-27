const LINK_REPLACEMENTS: Array<[RegExp, string]> = [
  [/https:\/\/www\.linkedin\.com\/company\/minervaims\/?/g, 'https://it.linkedin.com/company/minerva-investment-management'],
  // The society's account is @minerva.ims, as on the website footer; the
  // email pack was written with a handle that is not ours.
  [/https:\/\/www\.instagram\.com\/minervaims\/?(?=")/g, 'https://www.instagram.com/minerva.ims/'],
]

export function normalizeEmailLinks(html: string): string {
  return LINK_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    html,
  )
}