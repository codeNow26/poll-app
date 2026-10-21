export const SURVEY_CATEGORIES = [
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Team Activities',
  'Lifestyle & Preferences',
  'Technology & Innovation',
] as const;

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];