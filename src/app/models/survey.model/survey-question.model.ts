export interface SurveyQuestion {
  questionText: string;
  answers: string[];
  multipleAnswers: boolean;
}

export interface SavedSurveyQuestion extends SurveyQuestion {
  id: number;
}