// =====================================================================
// The disclaimers of the two templates, word for word as they close the
// documents themselves, so the page and the file always say the same.
// If the template's disclaimer changes, change it here too.
// =====================================================================

export interface DisclaimerPoint { title: string; text: string }

const MEMBERS_ONLY: DisclaimerPoint = {
  title: 'For Minerva IMS members only.',
  text: 'This template and guide are internal materials of Minerva Investment Management Society and are not to be circulated outside the society.',
};

export const CV_DISCLAIMER: DisclaimerPoint[] = [
  MEMBERS_ONLY,
  {
    title: 'Not a substitute for university materials.',
    text: 'We are not substituting Bocconi’s official CV guidelines and Career Service resources; this material should be used on top of them, not instead of them.',
  },
  {
    title: 'Disclaimer of liability.',
    text: 'Use at your own discretion. The guidance reflects the experience of Minerva members and is not professional career advice; Minerva IMS and its Board accept no responsibility for the outcome of any application. Each member remains responsible for the accuracy and truthfulness of their own CV.',
  },
];

export const CL_DISCLAIMER: DisclaimerPoint[] = [
  MEMBERS_ONLY,
  {
    title: 'Not a substitute for university materials.',
    text: 'We are not substituting Bocconi’s official cover letter guidelines and Career Service resources; this material should be used on top of them, not instead of them.',
  },
  {
    title: 'Disclaimer of liability.',
    text: 'Use at your own discretion. The guidance reflects the experience of Minerva members and is not professional career advice; Minerva IMS and its Board accept no responsibility for the outcome of any application. Each member remains responsible for the accuracy and truthfulness of their own application.',
  },
];
