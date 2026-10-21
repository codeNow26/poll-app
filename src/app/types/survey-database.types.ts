import { Survey } from '../models/survey.model/survey.model';
import { SurveyQuestion } from '../models/survey.model/survey-question.model';

export type SurveyData = Omit<Survey, 'questions'>;

export type QuestionData = SurveyQuestion & {
  survey_id: number;
};