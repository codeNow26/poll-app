import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Survey } from '../models/survey.model/survey.model';
import { SurveyQuestion } from '../models/survey.model/survey-question.model';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  client = createClient(
    'https://ovsxmmeifppkfttpbmil.supabase.co',
    'sb_publishable_qBy7OtYkvPX6WKcaOkgJ_g_AsvObfxz'
  );

  async saveSurvey(survey: Survey): Promise<void> {
    const surveyData = {
      title: survey.title,
      description: survey.description,
      category: survey.category,
      deadline: survey.deadline
    }
    const { data, error } = await this.client
      .from('surveys')
      .insert(surveyData)
      .select('id')
      .single();

    if (error) {
      console.error('Speichern fehlgeschlagen:', error);
      return;
    }

    const questionsData = survey.questions.map((question: SurveyQuestion) => {
      return {
        questionText: question.questionText,
        answers: question.answers,
        multipleAnswers: question.multipleAnswers,
        survey_id: data.id,
      };
    });
    const questionsResult = await this.client
      .from('questions')
      .insert(questionsData)

    if (questionsResult.error) {
      console.error('Frage Speichern fehlgeschlagen:', questionsResult.error);
      return;
    } else {
      console.log("Umfrage und Fragen gespeichert");
    }


    console.log('Gespeicherte Umfrage:', data);
    console.log(questionsData);
  }

  async loadSurveys(): Promise<Survey[]> {
    const { data, error } = await this.client
      .from('surveys')
      .select('*, questions(*)')

    if (error) {
      throw error;
    } else {
      return data;
    }
  }
}