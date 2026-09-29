import { SurveyQuestion, SavedSurveyQuestion } from "./survey-question.model";

export interface Survey {
  category: string;
  description: string;
  title: string;
  deadline: string | null;
  questions: SurveyQuestion[];
}

export interface SavedSurvey extends Survey {
  id: number;
  questions: SavedSurveyQuestion[];
}