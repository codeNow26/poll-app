import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';
import { Supabase } from '../../services/supabase';

type VotesChannel = ReturnType<Supabase['subscribeToVotes']>;
const PERCENTAGE_FACTOR: number = 100;
const VOTE_STORAGE_PREFIX: string = 'voted-survey-';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})

export class SurveyDetail implements OnInit, OnDestroy {
  route: ActivatedRoute = inject(ActivatedRoute);
  supabase: Supabase = inject(Supabase);
  votesChannel: VotesChannel | null = null;
  isDestroyed: boolean = false;

  survey: WritableSignal<SavedSurvey | null> =
    signal<SavedSurvey | null>(null);
  savedVotes: WritableSignal<SurveyVote[]> =
    signal<SurveyVote[]>([]);
  showSaveError: WritableSignal<boolean> = signal(false);
  isSaving: WritableSignal<boolean> = signal(false);
  hasVoted: WritableSignal<boolean> = signal(false);

  selectedAnswers: number[][] = [];
  showAnswerError: boolean = false;

  /** Reads the survey ID and starts loading the detail page. */
  async ngOnInit(): Promise<void> {
    const SURVEY_ID: number | null = this.getSurveyId();
    if (SURVEY_ID === null) {
      return;
    }
    this.restoreVotingStatus(SURVEY_ID);
    await this.loadSurveyDetails(SURVEY_ID);
  }

  /** Removes the realtime subscription when the component is destroyed. */
  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.votesChannel !== null) {
      void this.supabase.client.removeChannel(this.votesChannel);
      this.votesChannel = null;
    }
  }

  /** Updates an answer selection if voting is still allowed. */
  selectAnswer(questionIndex: number, answerIndex: number, isChecked: boolean,): void {
    const CURRENT_SURVEY: SavedSurvey | null = this.survey();
    if (CURRENT_SURVEY === null || this.isVotingBlocked()) {
      return;
    }
    if (!CURRENT_SURVEY.questions[questionIndex].multipleAnswers) {
      this.selectedAnswers[questionIndex] = [answerIndex];
      return;
    }
    this.updateMultipleAnswers(questionIndex, answerIndex, isChecked);
  }

  /** Validates the answers and starts saving the votes. */
  async submitAnswers(): Promise<void> {
    if (this.isVotingBlocked()) {
      return;
    }
    this.showSaveError.set(false);
    this.showAnswerError = false;
    const CURRENT_SURVEY: SavedSurvey | null = this.survey();
    if (CURRENT_SURVEY === null || !this.validateAnswers(CURRENT_SURVEY)) {
      return;
    }
    await this.saveSubmission(CURRENT_SURVEY);
  }

  /** Counts votes for a specific answer to a question. */
  getAnswerVoteCount(questionId: number, answerIndex: number): number {
    let count: number = 0;
    for (const VOTE of this.savedVotes()) {
      if (
        VOTE.question_id === questionId &&
        VOTE.answer_indices.includes(answerIndex)
      ) {
        count++;
      }
    }
    return count;
  }

  /** Counts submitted votes for a question. */
  getQuestionVoteCount(questionId: number): number {
    let count: number = 0;
    for (const VOTE of this.savedVotes()) {
      if (VOTE.question_id === questionId) {
        count++;
      }
    }
    return count;
  }

  /** Calculates the rounded vote percentage for an answer. */
  getAnswerPercentage(questionId: number, answerIndex: number): number {
    const TOTAL_VOTES: number = this.getQuestionVoteCount(questionId);
    if (TOTAL_VOTES === 0) {
      return 0;
    }
    const ANSWER_VOTES: number =
      this.getAnswerVoteCount(questionId, answerIndex);
    return Math.round((ANSWER_VOTES / TOTAL_VOTES) * PERCENTAGE_FACTOR);
  }

  /** Checks whether the deadline is before the current local day. */
  isSurveyExpired(): boolean {
    const CURRENT_SURVEY: SavedSurvey | null = this.survey();
    if (CURRENT_SURVEY === null || CURRENT_SURVEY.deadline === null) {
      return false;
    }
    const TODAY: Date = new Date();
    TODAY.setHours(0, 0, 0, 0);
    const DEADLINE: Date = new Date(
      CURRENT_SURVEY.deadline + 'T00:00:00',
    );
    return TODAY > DEADLINE;
  }

  /** Reads a valid positive survey ID from the URL. */
  getSurveyId(): number | null {
    const ROUTE_ID: string | null =
      this.route.snapshot.paramMap.get('id');
    if (ROUTE_ID === null) {
      return null;
    }
    const SURVEY_ID: number = Number(ROUTE_ID);
    return Number.isSafeInteger(SURVEY_ID) && SURVEY_ID > 0 ? SURVEY_ID : null;
  }

  /** Loads the survey and prepares answer selections and results. */
  async loadSurveyDetails(surveyId: number): Promise<void> {
    try {
      const LOADED_SURVEY: SavedSurvey =
        await this.supabase.loadSurvey(surveyId);
      if (this.isDestroyed) {
        return;
      }
      this.initializeSurvey(LOADED_SURVEY);
      await this.initializeResults(LOADED_SURVEY);
    } catch (error: unknown) {
      console.error('Umfrage konnte nicht geladen werden:', error);
    }
  }

  /** Initializes an empty answer selection for each question. */
  initializeSurvey(loadedSurvey: SavedSurvey): void {
    this.selectedAnswers = loadedSurvey.questions.map(
      (): number[] => [],
    );
    this.survey.set(loadedSurvey);
  }

  /** Starts the realtime subscription and loads existing votes. */
  async initializeResults(loadedSurvey: SavedSurvey): Promise<void> {
    const QUESTION_IDS: number[] = this.getQuestionIds(loadedSurvey);
    this.votesChannel = this.supabase.subscribeToVotes(
      (): void => {
        void this.refreshVotes(QUESTION_IDS);
      },
    );
    await this.refreshVotes(QUESTION_IDS);
  }

  /** Returns the IDs of all questions in a survey. */
  getQuestionIds(loadedSurvey: SavedSurvey): number[] {
    return loadedSurvey.questions.map(
      (question): number => question.id,
    );
  }

  /** Refreshes results and handles loading errors separately from saving. */
  async refreshVotes(questionIds: number[]): Promise<void> {
    try {
      const LOADED_VOTES: SurveyVote[] =
        await this.supabase.loadVotes(questionIds);
      if (!this.isDestroyed) {
        this.savedVotes.set(LOADED_VOTES);
      }
    } catch (error: unknown) {
      console.error('Ergebnisse konnten nicht geladen werden:', error);
    }
  }

  /** Checks whether changing answers or submitting votes is blocked. */
  isVotingBlocked(): boolean {
    return this.isSaving() || this.hasVoted() || this.isSurveyExpired();
  }

  /** Adds or removes an answer in a multiple-choice selection. */
  updateMultipleAnswers(
    questionIndex: number,
    answerIndex: number,
    isChecked: boolean,
  ): void {
    const ANSWERS: number[] = this.selectedAnswers[questionIndex] ?? [];
    const OTHER_ANSWERS: number[] = ANSWERS.filter(
      (selectedIndex: number): boolean => selectedIndex !== answerIndex,
    );
    this.selectedAnswers[questionIndex] = isChecked
      ? [...OTHER_ANSWERS, answerIndex]
      : OTHER_ANSWERS;
  }

  /** Checks whether every question has at least one selected answer. */
  validateAnswers(currentSurvey: SavedSurvey): boolean {
    this.showAnswerError = currentSurvey.questions.some(
      (_question, questionIndex: number): boolean =>
        (this.selectedAnswers[questionIndex]?.length ?? 0) === 0,
    );
    return !this.showAnswerError;
  }

  /** Builds the votes to save from the current answer selections. */
  createVotes(currentSurvey: SavedSurvey): SurveyVote[] {
    return currentSurvey.questions.map(
      (question, questionIndex: number): SurveyVote => ({
        question_id: question.id,
        answer_indices: [...this.selectedAnswers[questionIndex]],
      }),
    );
  }

  /** Saves the submission and always resets the saving state. */
  async saveSubmission(currentSurvey: SavedSurvey): Promise<void> {
    this.isSaving.set(true);
    try {
      await this.supabase.saveVotes(this.createVotes(currentSurvey));
      this.hasVoted.set(true);
      this.storeVotingStatus(currentSurvey.id);
    } catch (error: unknown) {
      this.showSaveError.set(true);
      console.error('Stimmen konnten nicht gespeichert werden:', error);
      return;
    } finally {
      this.isSaving.set(false);
    }
    await this.refreshVotes(this.getQuestionIds(currentSurvey));
  }

  /** Restores the survey's voting status from local storage. */
  restoreVotingStatus(surveyId: number): void {
    try {
      const STORED_STATUS: string | null =
        localStorage.getItem(VOTE_STORAGE_PREFIX + surveyId);
      this.hasVoted.set(STORED_STATUS === 'true');
    } catch (error: unknown) {
      console.error('Abstimmungsstatus konnte nicht gelesen werden:', error);
    }
  }

  /** Stores a successful submission's voting status in this browser. */
  storeVotingStatus(surveyId: number): void {
    try {
      localStorage.setItem(VOTE_STORAGE_PREFIX + surveyId, 'true');
    } catch (error: unknown) {
      console.error('Abstimmungsstatus konnte nicht gespeichert werden:', error);
    }
  }
}