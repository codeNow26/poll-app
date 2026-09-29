import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Supabase } from '../../services/supabase';
import { SavedSurvey, Survey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';


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

  survey = signal<SavedSurvey | null>(null);
  selectedAnswers: number[][] = [];
  showAnswerError = false;

  selectAnswer(questionIndex: number, answerIndex: number, isChecked: boolean) {
    const currentSurvey = this.survey();

    if (currentSurvey === null) {
      return;
    }

    if (currentSurvey.questions[questionIndex].multipleAnswers === false) {
      this.selectedAnswers[questionIndex] = [answerIndex];
    } else if (isChecked) {
      this.selectedAnswers[questionIndex].push(answerIndex)
    } else {
      this.selectedAnswers[questionIndex] = this.selectedAnswers[questionIndex].filter((selectedIndex) => selectedIndex !== answerIndex);
    }

    console.log(this.selectedAnswers);

    console.log(isChecked);
    console.log(questionIndex)
    console.log(answerIndex)
  }

  submitAnswers(): void {
    this.showAnswerError = false;

    const currentSurvey = this.survey();

    if (currentSurvey === null) {
      return;
    }

    const hasUnansweredQuestion = this.selectedAnswers.some(
      (answers) => answers.length === 0
    );

    if (hasUnansweredQuestion) {
      this.showAnswerError = true;
      return;
    }

    console.log('Geladene Fragen:', currentSurvey.questions);
    console.log('Deine Auswahl:', this.selectedAnswers);

    const votes: SurveyVote[] = currentSurvey.questions.map((question, questionIndex) => {
      const firstVote = {
        question_id: question.id,
        answer_indices: this.selectedAnswers[questionIndex]
      }
      return firstVote;
    });

    console.log(votes);

  }
}


