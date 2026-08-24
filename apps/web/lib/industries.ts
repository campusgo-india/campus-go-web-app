// Shared industry list — used by Company records and Alumni records so both
// can be filtered/matched consistently, rather than each collecting
// free-text industry names that never line up.
export const INDUSTRIES = [
  'IT / Software',
  'Banking & Finance',
  'Consulting',
  'Manufacturing',
  'Healthcare & Pharma',
  'Education',
  'E-commerce & Retail',
  'Telecom',
  'Automotive',
  'Real Estate & Construction',
  'Media & Entertainment',
  'Government / PSU',
  'Logistics & Supply Chain',
  'Energy & Utilities',
  'Hospitality & Travel',
  'Other',
] as const;
