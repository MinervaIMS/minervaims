// =====================================================================
// THE THREE PAGES OF MY PROFILE (Step 97B), by key and by name.
// ---------------------------------------------------------------------
// Each page used to open with a band showing the picture, the name, the
// role, the standing and two glance items. Since Step 110 none does: the
// workspace header shows the person on every page, and the commitment
// and the profile's completeness are on the pages that deal with them.
// What remains here is the pages' names, which give each page its
// level-one heading for assistive technology.
// =====================================================================

export type ProfilePage = 'my-role' | 'my-membership' | 'my-commitment';

export const PROFILE_PAGE_LABEL: Record<ProfilePage, string> = {
  'my-role': 'Personal Information',
  'my-membership': 'Membership',
  'my-commitment': 'Commitment',
};
