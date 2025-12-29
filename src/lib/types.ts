// Data types for MIMS website

export type Division = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';
export type Fund = 'long-short' | 'multi-asset' | 'dps' | 'pir';
export type Position = 
  | 'President'
  | 'Vice President'
  | 'Head of Asset Management'
  | 'Head of Equity Research'
  | 'Head of Investment Research'
  | 'Head of Macro Research'
  | 'Head of Portfolio Management'
  | 'Head of Quantitative Research'
  | 'Portfolio Manager'
  | 'Senior Analyst'
  | 'Analyst'
  | 'Head of Operations'
  | 'Head of Media'
  | 'Operations'
  | 'Media';

export interface Report {
  id: string;
  date: string;
  title: string;
  description: string;
  division: Division;
  fund?: Fund;
  pdfUrl: string;
}

export interface TeamMember {
  id: string;
  name: string;
  surname: string;
  position: Position;
  division?: Division;
  fund?: Fund;
  photoUrl?: string;
  linkedinUrl?: string;
  isBoard: boolean;
}

export interface Alumni {
  id: string;
  name: string;
  surname: string;
  graduationYear: number;
  currentRole: string;
  company: string;
  linkedinUrl?: string;
}

export interface Event {
  id: string;
  date: string;
  title: string;
  location?: string;
  description: string;
  photoUrl?: string;
}

export const divisionLabels: Record<Division, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
};

export const fundLabels: Record<Fund, string> = {
  'long-short': 'Long Short Equity Fund',
  'multi-asset': 'Multi Asset Global Opportunities Fund',
  'dps': 'Diversified Passive Selection Fund',
  'pir': 'Italian Equity PIR Fund',
};

export const activeFunds: Fund[] = ['long-short', 'multi-asset'];
export const closedFunds: Fund[] = ['dps', 'pir'];
