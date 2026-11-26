import type { ReactNode, RefObject } from 'react';
import { DeviceShowcase } from '@/components/shared/DeviceShowcase';
import { DEVICES, PREVIEW_FRAME_PATH, applicantPagePath, type DeviceKey } from '@/lib/applicant-frame';

// =====================================================================
// THE APPLICANT'S WORKSPACE IN A DEVICE (Step 108; Step 110).
// ---------------------------------------------------------------------
// Recruiting > Applicant Preview's use of the design system's device
// layout (DeviceShowcase): the page inside is the applicant's workspace
// (ApplicantFrame), started at the stage and page shown and told the
// width its device lays the page out at, and the address bar names the
// applicant's page.
// =====================================================================

export function DeviceStage({ device, page, start, frameRef, onFrameLoad, large = false, children }: {
  device: DeviceKey;
  /** Where the device's page starts: the stage and page shown when it is drawn. */
  start: { stage: string; page: string };
  /** Drawn as large as the window allows (the Full size view). */
  large?: boolean;
  /** The applicant's page shown, for the address bar. */
  page: string;
  frameRef: RefObject<HTMLIFrameElement>;
  onFrameLoad: () => void;
  /** Laid over the device (the "new in their menu" note). */
  children?: ReactNode;
}) {
  // The address is fixed when the device is drawn, so the page inside is
  // never reloaded by a change of stage (those arrive as messages).
  const src = `${PREVIEW_FRAME_PATH}?${new URLSearchParams({ ...start, w: String(DEVICES[device].viewport.width) }).toString()}`;
  return (
    <DeviceShowcase device={device} src={src} title="The applicant's workspace" address={applicantPagePath(page)}
      frameRef={frameRef} onFrameLoad={onFrameLoad} large={large}>
      {children}
    </DeviceShowcase>
  );
}
