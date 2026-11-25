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
}

export type DeviceKey = 'laptop' | 'tablet-landscape' | 'tablet-portrait' | 'phone';

export interface DeviceSpec {
  key: DeviceKey;
  label: string;
  /** The picture's size, in its own pixels. */
  image: { width: number; height: number };
  /** The screen inside it, in the picture's pixels. */
  screen: { left: number; top: number; width: number; height: number; radius: number };
  /** The page the device shows, in CSS pixels. */
  viewport: { width: number; height: number };
  /** The strip of the device's own chrome above the page (status bar, address bar), in CSS pixels. */
  chromeTop: number;
  /** And below it (the phone's address bar and home indicator). */
  chromeBottom: number;
}

export const DEVICES: Record<DeviceKey, DeviceSpec> = {
  laptop: {
    key: 'laptop', label: 'Computer',
    image: { width: 2000, height: 1316 },
    screen: { left: 216, top: 143, width: 1568, height: 1030, radius: 22 },
    // A 13-inch laptop at its usual setting: the page as most applicants'
    // computers draw it, and large enough to read inside the preview.
    viewport: { width: 1280, height: 841 }, chromeTop: 38, chromeBottom: 0,
  },
  'tablet-landscape': {
    key: 'tablet-landscape', label: 'Tablet',
    image: { width: 2000, height: 1424 },
    screen: { left: 83, top: 80, width: 1834, height: 1264, radius: 34 },
    viewport: { width: 1180, height: 813 }, chromeTop: 44, chromeBottom: 0,
  },
  'tablet-portrait': {
    key: 'tablet-portrait', label: 'Tablet',
    image: { width: 1424, height: 2000 },
    screen: { left: 80, top: 83, width: 1264, height: 1834, radius: 34 },
    viewport: { width: 813, height: 1180 }, chromeTop: 44, chromeBottom: 0,
  },
  phone: {
    key: 'phone', label: 'Phone',
    image: { width: 978, height: 2000 },
    screen: { left: 52, top: 48, width: 874, height: 1902, radius: 118 },
    viewport: { width: 390, height: 849 }, chromeTop: 50, chromeBottom: 64,
  },
};

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
