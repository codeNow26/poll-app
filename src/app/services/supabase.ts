import { Injectable } from '@angular/core';

import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from '@supabase/supabase-js';

import { SavedSurvey, Survey } from '../models/survey.model/survey.model';
import { SurveyQuestion } from '../models/survey.model/survey-question.model';
import { SurveyVote } from '../models/survey-vote.model';

type SurveyData = Omit<Survey, 'questions'>;
type QuestionData = SurveyQuestion & {
  survey_id: number;
};

const SUPABASE_URL: string = 'https://ovsxmmeifppkfttpbmil.supabase.co';
const SUPABASE_PUBLISHABLE_KEY: string = 'sb_publishable_qBy7OtYkvPX6WKcaOkgJ_g_AsvObfxz';

@Injectable({
  providedIn: 'root',
})

export class Supabase {
  readonly client: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );

  /** Saves a survey and its questions, then returns the survey ID. */
  async saveSurvey(survey: Survey): Promise<number> {
    const SURVEY_ID: number = await this.insertSurvey(
      this.createSurveyData(survey),
    );
    await this.saveQuestions(survey.questions, SURVEY_ID);
    return SURVEY_ID;
  }

  /** Loads all surveys with their associated questions. */
  async loadSurveys(): Promise<SavedSurvey[]> {
    const { data: DATA, error: ERROR } = await this.client
      .from('surveys')
      .select('*, questions(*)')
      .returns<SavedSurvey[]>();
    if (ERROR) {
      throw ERROR;
    }
    return DATA;
  }

  /** Loads one survey and its questions by survey ID. */
  async loadSurvey(surveyId: number): Promise<SavedSurvey> {
    const { data: DATA, error: ERROR } = await this.client
      .from('surveys')
      .select('*, questions(*)')
      .eq('id', surveyId)
      .single<SavedSurvey>();
    if (ERROR) {
      throw ERROR;
    }
    return DATA;
  }

  /** Saves the submitted votes for the survey questions. */
  async saveVotes(votes: SurveyVote[]): Promise<void> {
    const { error: ERROR } = await this.client
      .from('survey_votes')
      .insert(votes);
    if (ERROR) {
      throw ERROR;
    }
  }

  /** Loads votes belonging to the specified questions. */
  async loadVotes(questionIds: number[]): Promise<SurveyVote[]> {
    const { data: DATA, error: ERROR } = await this.client
      .from('survey_votes')
      .select('*')
      .in('question_id', questionIds)
      .returns<SurveyVote[]>();
    if (ERROR) {
      throw ERROR;
    }
    return DATA;
  }

  /** Runs the callback whenever a new vote is inserted. */
  subscribeToVotes(onVoteAdded: () => void): RealtimeChannel {
    return this.client
      .channel('survey-votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'survey_votes' },
        onVoteAdded,
      )
      .subscribe();
  }

  /** Extracts the fields stored in the surveys table. */
  private createSurveyData(survey: Survey): SurveyData {
    return {
      title: survey.title,
      description: survey.description,
      category: survey.category,
      deadline: survey.deadline,
    };
  }

  /** Inserts the survey fields and returns the generated ID. */
  private async insertSurvey(surveyData: SurveyData): Promise<number> {
    const { data: DATA, error: ERROR } = await this.client
      .from('surveys')
      .insert(surveyData)
      .select('id')
      .single<{ id: number }>();
    if (ERROR) {
      throw ERROR;
    }
    return DATA.id;
  }

  /** Saves the questions associated with a newly created survey. */
  private async saveQuestions(
    questions: SurveyQuestion[],
    surveyId: number,
  ): Promise<void> {
    const QUESTIONS_DATA: QuestionData[] =
      this.createQuestionsData(questions, surveyId);
    const { error: ERROR } = await this.client
      .from('questions')
      .insert(QUESTIONS_DATA);
    if (ERROR) {
      throw ERROR;
    }
  }

  /** Adds the parent survey ID to each question's database fields. */
  private createQuestionsData(
    questions: SurveyQuestion[],
    surveyId: number,
  ): QuestionData[] {
    return questions.map(
      (question: SurveyQuestion): QuestionData => ({
        questionText: question.questionText,
        answers: question.answers,
        multipleAnswers: question.multipleAnswers,
        survey_id: surveyId,
      }),
    );
  }
}