// =====================================================================
// The texts members and candidates sign (Step 97).
// ---------------------------------------------------------------------
// ONE FILE, MIRRORED: src/lib/declaration-text.ts is a byte-for-byte copy,
// so the page shows exactly the words the server stores and hashes
// (scripts/declarations.test.mjs). A change of wording is a new
// VERSION: every signature keeps the version and the SHA-256 of the text
// it was given, so an old signature never silently points at new words.
//
// THE ONE-ASSOCIATION DECLARATION IS NOT IN THE STATUTE. The Statute in
// force says nothing about membership of other associations, so this is
// a condition of membership approved by the Board of Directors; putting
// it in the Statute is a Fall 2027 item. The wording below is a draft for
// the President's approval.
// =====================================================================

export interface DeclarationText {
  version: string;
  title: string;
  intro: string;
  clauses: string[];
  closing: string;
  /** The box ticked beside the typed name. */
  agreement: string;
}

export const ONE_ASSOCIATION: DeclarationText = {
  version: 'one-association-2027-1',
  title: 'One-association declaration',
  intro: 'I, the undersigned, declare to Minerva Investment Management Society that:',
  clauses: [
    'while I am a member of Minerva Investment Management Society, I am not, and will not become, a member of another student association of Bocconi University whose activities concern finance, investment or asset management;',
    'if I am a member of such an association when I sign, I will leave it before my membership of Minerva Investment Management Society begins;',
    'I will tell the President or the Vice-President at once if my situation changes while I am a member.',
  ],
  closing: 'I understand that this declaration is a condition of membership approved by the Board of Directors, and I make it freely and in good faith.',
  agreement: 'I have read this declaration and I sign it.',
};

export const COMMITMENT_VERSION = 'semester-commitment-2027-1';

/** The commitment, for one semester and one answer. */
export function commitmentText(semesterLabel: string, decision: 'confirmed' | 'declined'): DeclarationText {
  return decision === 'confirmed'
    ? {
      version: COMMITMENT_VERSION,
      title: `Semester commitment, ${semesterLabel}`,
      intro: `I confirm my commitment to Minerva Investment Management Society for ${semesterLabel}.`,
      clauses: [
        'I will take an active part in the work assigned to me and in the Society’s initiatives during the semester, as Article 8 of the Statute asks of every member;',
        'I will tell my Head of Division or the Board at once if I can no longer do so.',
      ],
      closing: '',
      agreement: 'I confirm my commitment for this semester.',
    }
    : {
      version: COMMITMENT_VERSION,
      title: `Semester commitment, ${semesterLabel}`,
      intro: `I cannot commit to Minerva Investment Management Society for ${semesterLabel}.`,
      clauses: [
        'I understand that the Board will contact me about what this means for my membership, such as a semester of leave or leaving the Society (Article 9 of the Statute).',
      ],
      closing: '',
      agreement: 'I confirm that I cannot commit this semester.',
    };
}

/** The whole text as one string: what is hashed with each signature. */
export function plainText(t: DeclarationText): string {
  return [t.title, t.intro, ...t.clauses.map((c, i) => `${i + 1}. ${c}`), t.closing, t.agreement].filter(Boolean).join('\n');
}

/**
 * The words a stored signature was given, from its version: what My Profile
 * shows when a member reads what they signed. Null for a version this
 * release no longer carries.
 */
export function textOfSignature(version: string, semesterLabel: string, decision: 'signed' | 'confirmed' | 'declined'): DeclarationText | null {
  if (version === ONE_ASSOCIATION.version) return ONE_ASSOCIATION;
  if (version === COMMITMENT_VERSION) return commitmentText(semesterLabel, decision === 'declined' ? 'declined' : 'confirmed');
  return null;
}

/** A typed name counts as a signature when it has at least two words, as for an offer. */
export function typedNameOk(name: unknown): boolean {
  return typeof name === 'string' && name.trim().split(/\s+/).filter(Boolean).length >= 2 && name.trim().length <= 120;
}
