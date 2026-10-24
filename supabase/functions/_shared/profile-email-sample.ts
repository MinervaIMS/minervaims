// The two rows of the profile reminder (Step 96 layout). The database
// builds the real email with public.profile_missing_block and
// public.profile_photo_help_block, which the Step 96 migration writes from
// these; the previews use them as they are.
import { a, box, innerP, keyRow, keyWrap, SANS, T } from './email-layout.ts';

/** What each missing detail is for, as the reminder lists it. */
export const PROFILE_MISSING_ROWS: Record<'photo' | 'phone' | 'linkedin', [string, string]> = {
  photo: ['Profile photo', 'A professional headshot. It appears on the Members page of minervaims.org and next to your name in the Workspace.'],
  phone: ['Phone number', 'So that your Head of Division and the Board can reach you. It is visible only inside the Workspace.'],
  linkedin: ['LinkedIn link<br />(recommended)', 'The address of your LinkedIn profile, shown next to your photo on the Members page.'],
};

export function profileMissingBlock(photo: boolean, phone: boolean, linkedin: boolean): string {
  const rows = [photo && 'photo', phone && 'phone', linkedin && 'linkedin'].filter(Boolean) as Array<keyof typeof PROFILE_MISSING_ROWS>;
  if (!rows.length) return '';
  return keyWrap(rows.map((r) => keyRow(...PROFILE_MISSING_ROWS[r])).join(''));
}

export function profilePhotoHelpBlock(): string {
  return box(
    `<p class="m-ink" style="margin:0 0 8px;font-family:${SANS};font-size:16px;font-weight:700;line-height:1.4;color:${T.ink};">Making your profile photo with the Career tools</p>`
    + innerP(`In the Workspace, open ${a('https://minervaims.org/workspace/career/linkedin', 'Career, LinkedIn')} and find Profile Picture. You need an AI chat that can edit images.`)
    + innerP('1. Choose a square photo of yourself in formal clothes, facing the camera, in good light.<br />'
      + '2. Press Download the background (the Minerva background), then Copy prompt.<br />'
      + '3. In the AI chat, attach your photo first and the background second, paste the prompt and send it.<br />'
      + '4. Check that your face is exactly as in your photo.<br />'
      + '5. Upload the result in My Profile, from a computer.', true),
  );
}

export const PROFILE_MISSING_SAMPLE = profileMissingBlock(true, true, true);
export const PROFILE_PHOTO_HELP_SAMPLE = profilePhotoHelpBlock();
