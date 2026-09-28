import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Supabase } from '../../services/supabase';
import { Survey } from '../../models/survey.model/survey.model';


@Component({
  selector: 'app-survey-detail',
  imports: [],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit {
  route = inject(ActivatedRoute)
  supabase = inject(Supabase)

  async ngOnInit(): Promise<void> {
    console.log('Detailseite gestartet');

    const surveyId = this.route.snapshot.paramMap.get('id');

    if (surveyId === null) {
      return;
    }

    const numericSurveyId = Number(surveyId);

    if (!Number.isSafeInteger(numericSurveyId) || numericSurveyId < 1) {
      return;
    }

    try {
      const survey = await this.supabase.loadSurvey(numericSurveyId);
      this.survey.set(survey);
      this.selectedAnswers = survey.questions.map(() => {
        return [];
      });
      console.log(this.selectedAnswers);
      console.log(survey);
    } catch (error) {
      console.error('Umfrage konnte nicht geladen werden:', error);
    }
  }

  survey = signal<Survey | null>(null);
  selectedAnswers: number[][] = [];

  selectAnswer(questionIndex: number, answerIndex: number, isChecked: boolean) {
    const currentSurvey = this.survey();

    if (currentSurvey === null) {
      return;
    }

    if ( currentSurvey.questions[questionIndex].multipleAnswers === false ) {
      this.selectedAnswers[questionIndex] = [answerIndex];
    }

    console.log(this.selectedAnswers);
  
    console.log(isChecked);
    console.log(questionIndex)
    console.log(answerIndex)
  }

}