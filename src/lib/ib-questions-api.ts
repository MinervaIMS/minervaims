import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';
import type { Greenbook } from '@/lib/brainteasers-api';

// =====================================================================
// Career > IB Questions: what the page asks the `career-ib` function.
// The questions come with their four options but without the right one;
// the right answer and the guide's explanation come back one question at
// a time, once the reader has answered it.
// =====================================================================

export type IbBank = 'redbook' | 'blueprint';
export type IbLetter = 'A' | 'B' | 'C' | 'D';
export type IbStatus = 'right' | 'wrong';

export const IB_BANKS: { value: IbBank; label: string }[] = [
  { value: 'redbook', label: 'RedBook' },
  { value: 'blueprint', label: 'Banker Blueprint' },
];

export interface IbQuestion {
  id: string;
  bank: IbBank;
  subject: string;
  /** The subsection of the guide. */
  section: string;
  /** The question as it is asked here. */
  question: string;
  /** The guide's own wording of the interview question, where it differs. */
  original: string | null;
  /** 'completion': a statement from the guide with one term missing (____). */
  kind: 'technical' | 'completion';
  instruction: string;
  statement: string | null;
  /** In the order A, B, C, D; the page shuffles them. */
  options: string[];
  /** The page of the guide it comes from. */
  page: number | null;
  /** Hidden from members (only editors see hidden questions). */
  hidden: boolean;
  sort_order: number;
  updated_at?: string;
}

/** A question with its right answer and explanation, for editing. */
export interface IbQuestionFull extends IbQuestion { correct: IbLetter; explanation: string }

export interface IbProgress {
  /** Whether the last answer given was right. */
  status: IbStatus | null;
  choice: IbLetter | null;
  attempts: number;
  flagged: boolean;
  note: string | null;
  /** When the right answer was first given to the reader. */
  revealed_at: string | null;
  status_at: string | null;
}

/** A guide is a book like the greenbook. */
export type IbGuide = Greenbook;

export interface IbData {
  questions: IbQuestion[];
  progress: Record<string, IbProgress>;
  guides: Record<IbBank, IbGuide | null>;
  can_manage: boolean;
  can_replace_guides: boolean;
  limits: { answer_per_hour: number; answer_per_day: number; guide_per_day: number };
}

export interface IbAnswer { id: string; right: boolean; correct: IbLetter; explanation: string; progress: IbProgress }

const FN = 'career-ib';
const call = <T>(session: Session | null, body: Record<string, unknown>) => invokeFunction<T>(FN, { body, session });

export const loadIbQuestions = (s: Session | null) => call<IbData>(s, { action: 'list' });

export const answerIbQuestion = (s: Session | null, id: string, choice: IbLetter) => call<IbAnswer>(s, { action: 'answer', id, choice });

export const saveIbProgress = (s: Session | null, id: string, patch: Partial<Pick<IbProgress, 'flagged' | 'note'>>) =>
  call<{ id: string; progress: IbProgress }>(s, { action: 'progress', id, ...patch });

export const resetIbProgress = (s: Session | null, bank: IbBank) => call<{ success: boolean }>(s, { action: 'reset', bank });

export const fullIbQuestion = (s: Session | null, id: string) => call<{ question: IbQuestionFull }>(s, { action: 'full', id }).then((r) => r.question);

export interface IbQuestionDraft {
  id?: string;
  bank: IbBank;
  subject: string;
  section: string;
  question: string;
  original: string | null;
  kind: 'technical' | 'completion';
  instruction: string;
  statement: string | null;
  options: string[];
  correct: IbLetter;
  explanation: string;
  page: number | null;
  hidden: boolean;
}
export const saveIbQuestion = (s: Session | null, question: IbQuestionDraft) =>
  call<{ question: IbQuestionFull }>(s, { action: 'save', question }).then((r) => r.question);

// ── The guides ────────────────────────────────────────────────────────

/** The reader's own watermarked copy, as a file to save. */
export async function downloadIbGuide(s: Session | null, bank: IbBank): Promise<Blob> {
  const data = await invokeFunction<unknown>(FN, { body: { action: 'guide-download', bank }, session: s });
  if (!(data instanceof Blob)) throw new Error('The download did not arrive. Please try again.');
  return data;
}

/** Replace a guide: a one-time link, the file straight to storage, then the check. */
export async function uploadIbGuide(s: Session | null, bank: IbBank, file: File, title?: string): Promise<IbGuide> {
  const link = await call<{ bucket: string; path: string; token: string }>(s, { action: 'guide-upload-url', bank });
  const { error } = await supabase.storage.from(link.bucket).uploadToSignedUrl(link.path, link.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error(/size|large|exceed/i.test(error.message) ? 'The PDF is larger than storage accepts (60 MB).' : 'The upload did not go through. Please try again.');
  const done = await call<{ book: IbGuide }>(s, { action: 'guide-commit', bank, path: link.path, file_name: file.name, title });
  return done.book;
}

export const removeIbGuide = (s: Session | null, bank: IbBank) => call<{ success: boolean }>(s, { action: 'guide-remove', bank });

export const ibGuideRegister = (s: Session | null, bank: IbBank) =>
  call<{ downloads: { name: string; email: string | null; downloaded_at: string }[] }>(s, { action: 'guide-register', bank }).then((r) => r.downloads);
