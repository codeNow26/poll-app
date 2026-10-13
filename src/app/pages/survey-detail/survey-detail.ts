import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';
import { SavedSurvey, Survey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';



@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {
  route = inject(ActivatedRoute)
  supabase = inject(Supabase)

  votesChannel: ReturnType<Supabase['subscribeToVotes']> | null = null;

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
       this.hasVoted.set(localStorage.getItem('voted-survey-' + numericSurveyId) === 'true');
    } catch (error) {
      console.error('Fehler beim Abrufen des Stimmenstatus:', error);
    }

    try {
      const survey = await this.supabase.loadSurvey(numericSurveyId);

      this.selectedAnswers = survey.questions.map(() => {
        return [];
      });

      this.survey.set(survey);

      const questionIds: number[] = survey.questions.map((question) => {
        return question.id;
      });

      console.log(questionIds);
      const loadedVotes = await this.supabase.loadVotes(questionIds)
      console.log(loadedVotes);
      this.savedVotes.set(loadedVotes);
      this.votesChannel = this.supabase.subscribeToVotes(async () => {
  try {
    const updatedVotes = await this.supabase.loadVotes(questionIds);
    this.savedVotes.set(updatedVotes);
  } catch (error) {
    console.error('Live-Ergebnisse konnten nicht geladen werden:', error);
  }
});
      console.log(this.savedVotes());
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
    if (this.isSaving() === true || this.hasVoted() === true || this.isSurveyExpired() === true) {
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

    if (this.isSaving() === true || this.hasVoted() === true || this.isSurveyExpired() === true) {
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
      return;
    } finally {
      this.isSaving.set(false);
      console.log(votes);
    }

     try {
      localStorage.setItem('voted-survey-' + currentSurvey.id, 'true');
    } catch (error) {
      console.error('Fehler beim Speichern des Stimmenstatus:', error);
    }

    try {
      const loadedVotes = await this.supabase.loadVotes(currentSurvey.questions.map((question) => question.id));
      console.log(loadedVotes);

      this.savedVotes.set(loadedVotes);
    } catch (error) {
      console.error('Stimmen wurden gespeichert, aber Ergebnisse konnten nicht aktualisiert werden', error);
      return;
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

  isSurveyExpired(): boolean {
    const currentSurvey = this.survey();
    if (currentSurvey === null) {
      return false;
    }

    if (currentSurvey.deadline === null) {
      return false;
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deadline = new Date(currentSurvey.deadline + 'T00:00:00');

    return currentDate > deadline;
  }

  getQuestionVoteCount(questionId: number): number {
    let count = 0;
    for (const vote of this.savedVotes()) {
      if (vote.question_id === questionId) {
        count++;
      }
    }
    return count;
  }

  getAnswerPercentage(questionId: number, answerIndex: number): number {
    const totalVotes = this.getQuestionVoteCount(questionId);
    if (totalVotes === 0) {
      return 0;
    }

    const answerVotes = this.getAnswerVoteCount(questionId, answerIndex);
    const totalPercentage = answerVotes / totalVotes * 100;
    return Math.round(totalPercentage)
  }

  ngOnDestroy(): void {
  if (this.votesChannel !== null) {
    void this.supabase.client.removeChannel(this.votesChannel);
    this.votesChannel = null;
  }
}
}