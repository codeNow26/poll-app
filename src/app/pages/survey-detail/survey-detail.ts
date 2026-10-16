import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';
import { Supabase } from '../../services/supabase';
import { CreateSurvey } from '../create-survey/create-survey';

type VotesChannel = ReturnType<Supabase['subscribeToVotes']>;

const PERCENTAGE_FACTOR: number = 100;
const VOTE_STORAGE_PREFIX: string = 'voted-survey-';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink, CreateSurvey],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {
  route: ActivatedRoute = inject(ActivatedRoute);
  supabase: Supabase = inject(Supabase);

  routeSubscription: Subscription | null = null;
  votesChannel: VotesChannel | null = null;
  isDestroyed: boolean = false;
  loadVersion: number = 0;

  isCreateSurveyOpen: WritableSignal<boolean> = signal(false);
  survey: WritableSignal<SavedSurvey | null> = signal(null);
  savedVotes: WritableSignal<SurveyVote[]> = signal([]);
  showSaveError: WritableSignal<boolean> = signal(false);
  isSaving: WritableSignal<boolean> = signal(false);
  hasVoted: WritableSignal<boolean> = signal(false);

  selectedAnswers: number[][] = [];
  showAnswerError: boolean = false;

  /** Loads the survey whenever its route ID changes. */
  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(
      (params: ParamMap): void => {
        void this.changeSurvey(params.get('id'));
      },
    );
  }

  /** Removes subscriptions and ignores pending responses after destruction. */
  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.routeSubscription?.unsubscribe();
    void this.removeVotesChannel();
  }

  /** Clears the previous survey before loading the requested one. */
  async changeSurvey(routeId: string | null): Promise<void> {
    const version: number = ++this.loadVersion;
    this.resetSurveyState();
    await this.removeVotesChannel();
    const surveyId: number | null = this.getSurveyId(routeId);
    if (surveyId === null || !this.isCurrentLoad(version)) {
      return;
    }
    this.restoreVotingStatus(surveyId);
    await this.loadSurveyDetails(surveyId, version);
  }

  /** Resets the dialog, answers, results, and submission state. */
  resetSurveyState(): void {
    this.isCreateSurveyOpen.set(false);
    this.survey.set(null);
    this.savedVotes.set([]);
    this.selectedAnswers = [];
    this.hasVoted.set(false);
    this.isSaving.set(false);
    this.showSaveError.set(false);
    this.showAnswerError = false;
  }

  /** Stops listening for votes from the previous survey. */
  async removeVotesChannel(): Promise<void> {
    const channel: VotesChannel | null = this.votesChannel;
    this.votesChannel = null;
    if (channel === null) {
      return;
    }
    try {
      await this.supabase.client.removeChannel(channel);
    } catch (error: unknown) {
      console.error('Realtime subscription could not be removed:', error);
    }
  }

  /** Checks whether a response still belongs to the current page load. */
  isCurrentLoad(version: number): boolean {
    return !this.isDestroyed && version === this.loadVersion;
  }

  /** Converts a route parameter into a valid positive survey ID. */
  getSurveyId(routeId: string | null): number | null {
    if (routeId === null) {
      return null;
    }
    const surveyId: number = Number(routeId);
    return Number.isSafeInteger(surveyId) && surveyId > 0
      ? surveyId
      : null;
  }

  /** Loads the requested survey and prepares its results. */
  async loadSurveyDetails(surveyId: number, version: number): Promise<void> {
    try {
      const loadedSurvey: SavedSurvey =
        await this.supabase.loadSurvey(surveyId);
      if (!this.isCurrentLoad(version)) {
        return;
      }
      this.initializeSurvey(loadedSurvey);
      await this.initializeResults(loadedSurvey, version);
    } catch (error: unknown) {
      console.error('Survey could not be loaded:', error);
    }
  }

  /** Creates an empty answer selection for each question. */
  initializeSurvey(loadedSurvey: SavedSurvey): void {
    this.selectedAnswers = loadedSurvey.questions.map(
      (): number[] => [],
    );
    this.survey.set(loadedSurvey);
  }

  /** Starts the live subscription and loads existing votes. */
  async initializeResults(survey: SavedSurvey, version: number): Promise<void> {
    const questionIds: number[] = this.getQuestionIds(survey);
    this.votesChannel = this.supabase.subscribeToVotes(
      (): void => {
        if (this.isCurrentLoad(version)) {
          void this.refreshVotes(questionIds, version);
        }
      },
    );
    await this.refreshVotes(questionIds, version);
  }

  /** Returns all question IDs belonging to a survey. */
  getQuestionIds(survey: SavedSurvey): number[] {
    return survey.questions.map(
      (question): number => question.id,
    );
  }

  /** Updates results only if they still belong to the current survey. */
  async refreshVotes(questionIds: number[], version: number): Promise<void> {
    try {
      const loadedVotes: SurveyVote[] =
        await this.supabase.loadVotes(questionIds);
      if (this.isCurrentLoad(version)) {
        this.savedVotes.set(loadedVotes);
      }
    } catch (error: unknown) {
      console.error('Results could not be loaded:', error);
    }
  }

  /** Updates an answer selection while voting is allowed. */
  selectAnswer(questionIndex: number, answerIndex: number, isChecked: boolean): void {
    const currentSurvey: SavedSurvey | null = this.survey();
    if (currentSurvey === null || this.isVotingBlocked()) {
      return;
    }
    if (!currentSurvey.questions[questionIndex].multipleAnswers) {
      this.selectedAnswers[questionIndex] = [answerIndex];
      return;
    }
    this.updateMultipleAnswers(questionIndex, answerIndex, isChecked);
  }

  /** Adds or removes an answer without creating duplicate selections. */
  updateMultipleAnswers(
    questionIndex: number,
    answerIndex: number,
    isChecked: boolean,
  ): void {
    const answers: number[] = this.selectedAnswers[questionIndex] ?? [];
    const otherAnswers: number[] = answers.filter(
      (selectedIndex: number): boolean => selectedIndex !== answerIndex,
    );
    this.selectedAnswers[questionIndex] = isChecked
      ? [...otherAnswers, answerIndex]
      : otherAnswers;
  }

  /** Checks whether changing or submitting answers is blocked. */
  isVotingBlocked(): boolean {
    return this.survey() === null ||
      this.isSaving() || this.hasVoted() || this.isSurveyExpired();
  }

  /** Validates the selected answers and saves the submission. */
  async submitAnswers(): Promise<void> {
    if (this.isVotingBlocked()) {
      return;
    }
    this.showSaveError.set(false);
    this.showAnswerError = false;
    const currentSurvey: SavedSurvey | null = this.survey();
    if (currentSurvey === null || !this.validateAnswers(currentSurvey)) {
      return;
    }
    await this.saveSubmission(currentSurvey);
  }

  /** Checks whether every question has at least one selected answer. */
  validateAnswers(currentSurvey: SavedSurvey): boolean {
    this.showAnswerError = currentSurvey.questions.some(
      (_question, questionIndex: number): boolean =>
        (this.selectedAnswers[questionIndex]?.length ?? 0) === 0,
    );
    return !this.showAnswerError;
  }

  /** Builds the vote records from the current answer selections. */
  createVotes(currentSurvey: SavedSurvey): SurveyVote[] {
    return currentSurvey.questions.map(
      (question, questionIndex: number): SurveyVote => ({
        question_id: question.id,
        answer_indices: [...this.selectedAnswers[questionIndex]],
      }),
    );
  }

  /** Saves votes without changing the state of a different survey. */
  async saveSubmission(currentSurvey: SavedSurvey): Promise<void> {
    const version: number = this.loadVersion;
    this.isSaving.set(true);
    try {
      await this.supabase.saveVotes(this.createVotes(currentSurvey));
      this.storeVotingStatus(currentSurvey.id);
      await this.finishSubmission(currentSurvey, version);
    } catch (error: unknown) {
      this.handleSaveError(error, version);
    } finally {
      if (this.isCurrentLoad(version)) {
        this.isSaving.set(false);
      }
    }
  }

  /** Marks a successful submission and refreshes its results. */
  async finishSubmission(survey: SavedSurvey, version: number): Promise<void> {
    if (!this.isCurrentLoad(version)) {
      return;
    }
    this.hasVoted.set(true);
    await this.refreshVotes(this.getQuestionIds(survey), version);
  }

  /** Shows a save error only for the survey that is still displayed. */
  handleSaveError(error: unknown, version: number): void {
    if (this.isCurrentLoad(version)) {
      this.showSaveError.set(true);
    }
    console.error('Votes could not be saved:', error);
  }

  /** Counts votes for one answer to a question. */
  getAnswerVoteCount(questionId: number, answerIndex: number): number {
    let count: number = 0;
    for (const vote of this.savedVotes()) {
      if (
        vote.question_id === questionId &&
        vote.answer_indices.includes(answerIndex)
      ) {
        count++;
      }
    }
    return count;
  }

  /** Counts submitted votes for a question. */
  getQuestionVoteCount(questionId: number): number {
    let count: number = 0;
    for (const vote of this.savedVotes()) {
      if (vote.question_id === questionId) {
        count++;
      }
    }
    return count;
  }

  /** Calculates the rounded percentage for an answer. */
  getAnswerPercentage(questionId: number, answerIndex: number): number {
    const totalVotes: number = this.getQuestionVoteCount(questionId);
    if (totalVotes === 0) {
      return 0;
    }
    const answerVotes: number =
      this.getAnswerVoteCount(questionId, answerIndex);
    return Math.round((answerVotes / totalVotes) * PERCENTAGE_FACTOR);
  }

  /** Checks whether the deadline is before the current local day. */
  isSurveyExpired(): boolean {
    const currentSurvey: SavedSurvey | null = this.survey();
    if (currentSurvey === null || currentSurvey.deadline === null) {
      return false;
    }
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline: Date = new Date(currentSurvey.deadline + 'T00:00:00');
    return today > deadline;
  }

  /** Restores the voting status saved in this browser. */
  restoreVotingStatus(surveyId: number): void {
    try {
      const storedStatus: string | null =
        localStorage.getItem(VOTE_STORAGE_PREFIX + surveyId);
      this.hasVoted.set(storedStatus === 'true');
    } catch (error: unknown) {
      console.error('Voting status could not be read:', error);
    }
  }

  /** Stores a successful submission's voting status in this browser. */
  storeVotingStatus(surveyId: number): void {
    try {
      localStorage.setItem(VOTE_STORAGE_PREFIX + surveyId, 'true');
    } catch (error: unknown) {
      console.error('Voting status could not be saved:', error);
    }
  }
}