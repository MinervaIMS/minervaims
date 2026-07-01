// =====================================================================
// bocconi — the list of Bocconi University degree programmes, used as a
// closed-choice dropdown in the application form and the event
// registration form. Grouped by level. Adjust here if the university
// updates its programme catalogue.
// =====================================================================

export interface ProgrammeGroup {
  label: string;
  options: string[];
}

export const BOCCONI_PROGRAMMES: ProgrammeGroup[] = [
  {
    label: 'Bachelor of Science',
    options: [
      'Economics and Management (CLEAM)',
      'International Economics and Management (BIEM)',
      'Economics and Finance (CLEF)',
      'International Economics and Finance (BIEF)',
      'Economics, Management and Computer Science (BEMACS)',
      'Economic and Social Sciences (BESS)',
      'International Politics and Government (BIG)',
      'Economics and Management for Arts, Culture and Communication (CLEACC)',
      'Mathematical and Computing Sciences for Artificial Intelligence',
      'World Bachelor in Business (WBB)',
    ],
  },
  {
    label: 'Master of Science',
    options: [
      'Management',
      'Marketing Management',
      'Accounting, Financial Management and Control',
      'Finance',
      'Economics and Management in Arts, Culture, Media and Entertainment (ACME)',
      'International Management',
      'Data Science and Business Analytics',
      'Artificial Intelligence',
      'Economic and Social Sciences (ESS)',
      'Politics and Policy Analysis',
      'Economics and Management of Government and International Organisations',
      'Cyber Risk Strategy and Governance',
      'Economics and Management of Innovation and Technology (EMIT)',
      'Transformative Sustainability',
    ],
  },
  {
    label: 'Law',
    options: [
      'Law (Giurisprudenza)',
      'Global Law',
    ],
  },
  {
    label: 'PhD / Other',
    options: [
      'PhD programme',
      'Other Bocconi programme',
    ],
  },
];

/** Flat list of every programme, e.g. for validation. */
export const BOCCONI_PROGRAMME_VALUES: string[] = BOCCONI_PROGRAMMES.flatMap((g) => g.options);
