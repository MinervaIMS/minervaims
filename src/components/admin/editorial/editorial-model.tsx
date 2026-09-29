import type { ReactNode } from 'react';
import { CircleCheck, CircleDashed, CircleDot, CircleX, Globe, Instagram, Linkedin, PenLine } from 'lucide-react';
import {
  normalisedDestinations,
  type EditorialInput, type EditorialItem, type EditorialPlatform, type EditorialStatus,
} from '@/lib/smm-api';

// =====================================================================
// How an editorial item shows what it is and how far along it is.
// ---------------------------------------------------------------------
// THE STATUS IS THE COLOUR, THE PLATFORM IS THE ICON. The old chips were
// coloured by platform, so a glance told you where a post was going but
// not whether it was ready, which is the question a content plan is
// read for. Now each status has its own style AND its own icon (so
// nothing is told by colour alone), and the platforms ride along as
// their own small icons: Instagram, LinkedIn, or a globe for elsewhere.
//
// The five statuses are the pipeline, in order:
//   Idea -> Scheduled -> In progress -> Published    (and Cancelled)
// =====================================================================

export const STATUS_ORDER: EditorialStatus[] = ['idea', 'scheduled', 'in_progress', 'published', 'cancelled'];

export const STATUS_STYLE: Record<EditorialStatus, {
  chip: string;
  badge: string;
  column: string;
  icon: (cls?: string) => ReactNode;
  hint: string;
}> = {
  idea: {
    chip: 'border border-dashed border-slate-400 bg-background text-slate-800',
    badge: 'border border-dashed border-slate-400 text-slate-700',
    column: 'border-t-slate-400',
    icon: (c = 'h-3.5 w-3.5') => <CircleDashed className={c} />,
    hint: 'Worth doing, not yet planned.',
  },
  scheduled: {
    chip: 'border border-accent/40 bg-accent/[0.07] text-foreground',
    badge: 'border border-accent/40 bg-accent/[0.07] text-accent',
    column: 'border-t-accent',
    icon: (c = 'h-3.5 w-3.5') => <CircleDot className={c} />,
    hint: 'Has a date; work has not started.',
  },
  in_progress: {
    chip: 'border border-amber-500/60 bg-amber-50 text-amber-950',
    badge: 'border border-amber-500/60 bg-amber-50 text-amber-900',
    column: 'border-t-amber-500',
    icon: (c = 'h-3.5 w-3.5') => <PenLine className={c} />,
    hint: 'Being written or designed.',
  },
  published: {
    chip: 'border border-emerald-600/40 bg-emerald-50 text-emerald-950',
    badge: 'border border-emerald-600/40 bg-emerald-50 text-emerald-800',
    column: 'border-t-emerald-600',
    icon: (c = 'h-3.5 w-3.5') => <CircleCheck className={c} />,
    hint: 'Out.',
  },
  cancelled: {
    chip: 'border border-separator bg-muted/40 text-muted-foreground line-through',
    badge: 'border border-separator bg-muted/40 text-muted-foreground',
    column: 'border-t-slate-300',
    icon: (c = 'h-3.5 w-3.5') => <CircleX className={c} />,
    hint: 'Dropped. Kept for the record.',
  },
};

export const PLATFORM_ICON: Record<EditorialPlatform, (cls?: string) => ReactNode> = {
  instagram: (c = 'h-3.5 w-3.5') => <Instagram className={c} />,
  linkedin: (c = 'h-3.5 w-3.5') => <Linkedin className={c} />,
  other: (c = 'h-3.5 w-3.5') => <Globe className={c} />,
};

export const EMPTY_EDITORIAL: EditorialInput = {
  title: '', event_id: null, platforms: ['instagram'], formats: ['ig_post'], scheduled_date: '', responsible_person: '', status: 'idea', paid: false, notes: '',
};

export function toInput(i: EditorialItem): EditorialInput {
  const { platforms, formats } = normalisedDestinations(i);
  return {
    id: i.id, title: i.title, event_id: i.event_id ?? null, platforms, formats,
    scheduled_date: i.scheduled_date ?? '', responsible_person: i.responsible_person ?? '',
    status: i.status, paid: i.paid, notes: i.notes ?? '',
  };
}
