import { SurveyQuestion } from "./survey-question.model";

export interface Survey {
  category: string;
  description: string;
  title: string;
  deadline: string | null;
  questions: SurveyQuestion[];
}