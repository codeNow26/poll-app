import { Injectable } from '@angular/core';
import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from '@supabase/supabase-js';

import { SavedSurvey, Survey } from '../models/survey.model/survey.model';
import { SurveyQuestion } from '../models/survey.model/survey-question.model';
import { SurveyVote } from '../models/survey-vote.model';
import { QuestionData, SurveyData } from '../types/survey-database.types';

const SUPABASE_URL: string = 'https://ovsxmmeifppkfttpbmil.supabase.co';
const SUPABASE_PUBLISHABLE_KEY: string =
  'sb_publishable_qBy7OtYkvPX6WKcaOkgJ_g_AsvObfxz';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  readonly client: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );

  /**
   * Saves a survey and its questions.
   * @param survey - Survey data from the creation form.
   * @returns The ID of the saved survey.
   */
  async saveSurvey(survey: Survey): Promise<number> {
    const surveyId: number = await this.insertSurvey(
      this.createSurveyData(survey),
    );
    await this.saveQuestions(survey.questions, surveyId);
    return surveyId;
  }

  /**
   * Loads all surveys with their questions.
   * @returns The saved surveys.
   */
  async loadSurveys(): Promise<SavedSurvey[]> {
    const { data, error } = await this.client
      .from('surveys')
      .select('*, questions(*)')
      .returns<SavedSurvey[]>();
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Loads one survey with its questions.
   * @param surveyId - ID of the requested survey.
   * @returns The matching survey.
   */
  async loadSurvey(surveyId: number): Promise<SavedSurvey> {
    const { data, error } = await this.client
      .from('surveys')
      .select('*, questions(*)')
      .eq('id', surveyId)
      .single<SavedSurvey>();
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Saves the submitted answers.
   * @param votes - Selected answer indices for each question.
   * @returns A promise that resolves when the votes are saved.
   */
  async saveVotes(votes: SurveyVote[]): Promise<void> {
    const { error } = await this.client
      .from('survey_votes')
      .insert(votes);
    if (error) {
      throw error;
    }
  }

  /**
   * Loads votes for the given questions.
   * @param questionIds - IDs of the survey's questions.
   * @returns The saved votes for those questions.
   */
  async loadVotes(questionIds: number[]): Promise<SurveyVote[]> {
    const { data, error } = await this.client
      .from('survey_votes')
      .select('*')
      .in('question_id', questionIds)
      .returns<SurveyVote[]>();
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Listens for new votes in the database.
   * @param onVoteAdded - Callback called when a vote is inserted.
   * @returns The channel to remove when the subscription is no longer needed.
   */
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

  /**
   * Selects the fields stored in the surveys table.
   * @param survey - Complete survey including its questions.
   * @returns Survey data without the questions.
   */
  private createSurveyData(survey: Survey): SurveyData {
    return {
      title: survey.title,
      description: survey.description,
      category: survey.category,
      deadline: survey.deadline,
    };
  }

  /**
   * Creates an entry in the surveys table.
   * @param surveyData - Fields to save for the survey.
   * @returns The generated survey ID.
   */
  private async insertSurvey(surveyData: SurveyData): Promise<number> {
    const { data, error } = await this.client
      .from('surveys')
      .insert(surveyData)
      .select('id')
      .single<{ id: number }>();
    if (error) {
      throw error;
    }
    return data.id;
  }

  /**
   * Saves the questions belonging to a survey.
   * @param questions - Questions from the creation form.
   * @param surveyId - ID of the newly saved survey.
   * @returns A promise that resolves when the questions are saved.
   */
  private async saveQuestions(
    questions: SurveyQuestion[],
    surveyId: number,
  ): Promise<void> {
    const questionData: QuestionData[] =
      this.createQuestionsData(questions, surveyId);
    const { error } = await this.client
      .from('questions')
      .insert(questionData);
    if (error) {
      throw error;
    }
  }

  /**
   * Adds the survey ID to each question's database fields.
   * @param questions - Questions to prepare for saving.
   * @param surveyId - ID of their parent survey.
   * @returns Question entries ready for the database.
   */
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