// =====================================================================
// division-fit: the public Division Fit test, as the page sees it.
// ---------------------------------------------------------------------
// The engine (the questions, the adaptive rules, the scoring) runs in the
// `division-fit` edge function, so it cannot be copied from the website.
// The page sends the answers given so far and receives the next question,
// with its options under opaque ids, or the result. Nothing is stored:
// the answers live in the page's memory until it is closed or refreshed.
//
// Only the words the engine does not carry live here: the introduction,
// the year question, the two clarifying questions' headings and the way a
// result is explained.
// =====================================================================

import { invokeFunction } from '@/lib/errors';
import type { OrgDivision } from '@/lib/roles';

export type FitYear = 'first' | 'second' | 'advanced';
export type FitDestination = 'ER' | 'IR' | 'MR' | 'QR' | 'MA' | 'LS';

/** Year of study: it changes the wording only, never the scoring. */
export const FIT_YEARS: { value: FitYear; label: string }[] = [
  { value: 'first', label: 'First year' },
  { value: 'second', label: 'Second year' },
  { value: 'advanced', label: 'Third year or Master’s' },
];

export const FIT_PARTS: Record<1 | 2, string> = {
  1: 'Everyday situations',
  2: 'Your interests',
};

export const FIT_HEADINGS = {
  year: 'Which year of study are you in?',
  topic: 'Which of these financial-market topics would you most like to explore?',
  classes: 'Which of these university classes would you enjoy most?',
};

export interface FitOption { id: string; text: string }

export interface FitQuestion {
  step: 'question';
  key: 'music' | 'f1' | 'espresso' | 'hike' | 'topic' | 'classes';
  part: 1 | 2;
  label?: string;
  title?: string;
  options: FitOption[];
}

export interface FitPlace {
  id: FitDestination;
  name: string;
  description: string;
  /** Where the application form places it. */
  apply: OrgDivision;
  href: string;
}

export interface FitEvidence { everyday: number; topic: boolean; classes: boolean }

export interface FitResult {
  step: 'result';
  noMatch: boolean;
  first: FitPlace | null;
  firstEvidence: FitEvidence | null;
  second: FitPlace | null;
  secondStrength: 'Supported' | 'Worth exploring' | null;
  secondEvidence: FitEvidence | null;
  secondOmitted: boolean;
}

export type FitStep = FitQuestion | FitResult;

export interface FitAnswers {
  music?: string; f1?: string; espresso?: string; hike?: string;
}

/** The next step for the answers given so far. */
export async function nextFitStep(year: FitYear, answers: FitAnswers, topic?: string, classes?: string): Promise<FitStep> {
  return await invokeFunction<FitStep>('division-fit', { body: { year, answers, topic, classes } });
}

// =====================================================================
// FROM THE RESULT TO THE APPLICATION FORM. Only the destination id
// travels, as `?fit=ER`, and the form turns it into the division it
// preselects. The two funds both belong to Portfolio Management, which is
// the division the form offers; the student can change it either way.
// =====================================================================
export const FIT_TO_DIVISION: Record<FitDestination, OrgDivision> = {
  ER: 'equity', IR: 'investment', MR: 'macro', QR: 'quant', MA: 'portfolio', LS: 'portfolio',
};

export const FIT_NAMES: Record<FitDestination, string> = {
  ER: 'Equity Research',
  IR: 'Investment Research',
  MR: 'Macro Research',
  QR: 'Quantitative Research',
  MA: 'Multi Asset Global Opportunities Fund',
  LS: 'Long Short Equity Fund',
};

export function isFitDestination(v: unknown): v is FitDestination {
  return typeof v === 'string' && v in FIT_TO_DIVISION;
}

const COUNT = ['no', 'one', 'two', 'three', 'four'];

/** Why a destination may fit, in plain words, from the evidence behind it. */
export function explainEvidence(e: FitEvidence | null): string {
  if (!e) return '';
  const n = Math.max(0, Math.min(4, e.everyday));
  const everyday = n === 0
    ? ''
    : `${COUNT[n].charAt(0).toUpperCase()}${COUNT[n].slice(1)} of your answers to the everyday situations pointed here`;
  const interests = e.topic && e.classes
    ? 'both the topic and the class you chose'
    : e.topic ? 'the topic you chose' : e.classes ? 'the class you chose' : '';
  if (everyday && interests) return `${everyday}, and so did ${interests}.`;
  if (everyday) return `${everyday}.`;
  if (interests) return `It matches ${interests}.`;
  return '';
}
