// =====================================================================
// THE APPLICANT PREVIEW'S DEVICES (Step 108).
// ---------------------------------------------------------------------
// Recruiting > Applicant Preview draws the applicant's workspace in a
// computer, a tablet (held either way) and a phone: the supplied frames
// in src/assets/devices, each with its screen measured in the picture's
// own pixels, and the size of page (in CSS pixels) that device shows, so
// the workspace inside lays itself out as it would on that device. The
// page inside is /workspace/applicant-preview-frame (ApplicantFrame),
// told the stage and the page by window messages from the same origin.
// =====================================================================

export const PREVIEW_MESSAGE = 'mims-applicant-preview';
export const PREVIEW_PAGE_MESSAGE = 'mims-applicant-preview-page';
/** The device's page is ready to be told the stage and the page. */
export const PREVIEW_READY_MESSAGE = 'mims-applicant-preview-ready';
export const PREVIEW_FRAME_PATH = '/workspace/applicant-preview-frame';

export interface PreviewFrameMessage {
  type: typeof PREVIEW_MESSAGE | typeof PREVIEW_PAGE_MESSAGE | typeof PREVIEW_READY_MESSAGE;
  stage?: string;
  page?: string;
  /** The width, in CSS pixels, the device's page is laid out at (Step 110). */
  width?: number;
}

// The devices themselves are the design system's (Step 110).
export { DEVICES, deviceKeyOf, type DeviceFamily, type DeviceKey, type DeviceSpec } from '@/lib/device-frames';

/** The workspace page shown for an applicant's page key. */
export function applicantPagePath(page: string): string {
  const slug: Record<string, string> = {
    'applications-status': 'applications/status',
    'applications-interview': 'applications/interview',
    'applications-call': 'applications/phone-call',
    'applications-offer': 'applications/offer',
    'applications-faqs': 'applications/faqs',
    'my-role': 'my-profile',
  };
  return `minervaims.org/workspace/${slug[page] ?? 'applications/status'}`;
}
