// =====================================================================
// THE DEVICES OF THE DESIGN SYSTEM (Step 110; Step 108 for the preview).
// ---------------------------------------------------------------------
// A computer, a tablet (held either way) and a phone: the supplied
// frames in src/assets/devices, each with its screen measured in the
// picture's own pixels, and the size of page, in CSS pixels, that device
// shows, so a page drawn inside lays itself out as it would on that
// device. Drawn by DeviceShowcase (src/components/shared/DeviceShowcase.tsx),
// the one layout for showing a live page in a device anywhere on the site.
// =====================================================================

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

/** The three families a reader chooses between; the tablet turns. */
export type DeviceFamily = 'laptop' | 'tablet' | 'phone';
export const deviceKeyOf = (family: DeviceFamily, upright: boolean): DeviceKey =>
  (family === 'tablet' ? (upright ? 'tablet-portrait' : 'tablet-landscape') : family);
