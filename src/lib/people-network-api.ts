import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';

// =====================================================================
// PEOPLE > NETWORK (Steps 111 and 112): what the page reads from `people-network`.
// ---------------------------------------------------------------------
// The analysis runs on the server (`_shared/network-engine.ts`); the
// browser receives only its results: each person's measures and ranks,
// the ties of the latest analysis (as pairs of places in the list), and
// the ranks at each weekly point and at the end of each past semester.
// =====================================================================

/**
 * Reports, Boards (one per semester), divisions, interviews (a head with a
 * new joiner of their division), and the semesters one was President or
 * Vice-President while the other was a member (`officer`, Step 112).
 */
export interface TieCounts { report: number; board: number; division: number; interview: number; officer?: number }

export interface NetworkPerson {
  /** A person's id, or 'm:' and a member record's id. */
  node: string;
  name: string;
  first_semester: string | null;
  last_semester: string | null;
  is_current: boolean;
  /** People tied to. */
  degree: number;
  /** Sum of tie weights. */
  strength: number;
  status: number;
  mediation: number;
  coalition: number;
  cohesion: number;
  ego: number;
  reach: number;
  community: number;
  /** The person's division of belonging (Step 112): 'equity', 'media_operations', 'board', and so on. */
  division?: string | null;
  overall: number;
  rank_status: number;
  rank_mediation: number;
  rank_coalition: number;
  rank_overall: number;
  x: number | null;
  y: number | null;
  groups: TieCounts;
}

/** [person a, person b, weight, reports, Boards, divisions, interviews, officer semesters]: a and b are places in `scores`. */
export type NetworkTieRow = [number, number, number, number, number, number, number, number?];

/** A division and how central its people are: their mean overall (0 to 1). */
export interface DivisionCentrality { key: string; people: number; centrality: number }

export interface NetworkSummary {
  people: number;
  connected: number;
  ties: number;
  communities: number;
  modularity: number;
  groups: TieCounts;
  robustness?: { status: number; mediation: number; strengthDegree: number };
  /** Since Step 112, each division, most central first. */
  divisions?: DivisionCentrality[];
}

/** Ranks at one point: node to [overall, status, mediation, coalition]. */
export type RankMap = Record<string, [number, number, number, number]>;

export interface NetworkRead {
  canManage: boolean;
  current: string;
  currentLabel: string;
  /** False when the data changed after the latest analysis (it catches up overnight). */
  upToDate: boolean;
  latest: {
    id: string;
    kind: 'weekly' | 'update';
    semester: string;
    week: string | null;
    computed_at: string;
    summary: NetworkSummary;
    scores: NetworkPerson[];
    ties: NetworkTieRow[];
  } | null;
  /** Every past semester, analysed or still to analyse (Step 112). */
  allSemesters?: { semester: string; label: string }[];
  semesters: { semester: string; label: string; computed_at: string; summary: NetworkSummary; ranks: RankMap }[];
  history: { ready: number; total: number };
  excluded: { node: string; name: string; note: string | null; created_at: string }[];
}

export function readNetwork(session: Session | null): Promise<NetworkRead> {
  return invokeFunction<NetworkRead>('people-network', { body: { action: 'read' }, session });
}

/** Leave a person out of the analysis (they objected); their stored results go at once. */
export function leaveOut(session: Session | null, node: string, name: string, note: string): Promise<{ success: boolean }> {
  return invokeFunction('people-network', { body: { action: 'exclude', node, name, note }, session });
}

export function bringBack(session: Session | null, node: string): Promise<{ success: boolean }> {
  return invokeFunction('people-network', { body: { action: 'include', node }, session });
}
