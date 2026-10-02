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

      const questionIds: number[] = survey.questions.map((question) => {
        return question.id;
      });

      console.log(questionIds);

      const loadedVotes = await this.supabase.loadVotes(questionIds)
      console.log(loadedVotes);

      this.savedVotes.set(loadedVotes);
      console.log(this.savedVotes());

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
  showSaveError = signal(false);
  isSaving = signal(false);
  hasVoted = signal(false);
  savedVotes = signal<SurveyVote[]>([]);

  selectAnswer(questionIndex: number, answerIndex: number, isChecked: boolean) {
    if (this.isSaving() === true || this.hasVoted() === true) {
      return;
    }

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

  async submitAnswers(): Promise<void> {
    if (this.isSaving() === true || this.hasVoted() === true) {
      return;
    }

    this.showSaveError.set(false);
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
    console.log('Deine ausgewählten Antworten:', this.selectedAnswers);

    const votes: SurveyVote[] = currentSurvey.questions.map((question, questionIndex) => {
      const firstVote = {
        question_id: question.id,
        answer_indices: this.selectedAnswers[questionIndex]
      }
      return firstVote;
    });
    this.isSaving.set(true);
    try {
      await this.supabase.saveVotes(votes)
      this.hasVoted.set(true);
      console.log("Stimmen gespeichert");
    } catch (error) {
      this.showSaveError.set(true);
      console.error("Stimmen konnten nicht gespeichert werden", error);
    } finally {
      this.isSaving.set(false);
      console.log(votes);
    }
  }

  getAnswerVoteCount(questionId: number, answerIndex: number): number {
    let count = 0;
    for (const vote of this.savedVotes()) {
      if (vote.question_id === questionId && vote.answer_indices.includes(answerIndex)) {
        count++;
      }
    }
    return count;
  }
}


