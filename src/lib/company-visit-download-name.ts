import { safeFileName } from './file-download';

/** A company visit's CV archive keeps the event's readable name. */
export function companyVisitCvZipName(title: string): string {
  return `CV_${safeFileName(title, 'Company visit')}.zip`;
}