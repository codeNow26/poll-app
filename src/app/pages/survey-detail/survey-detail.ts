import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SurveyResults } from '../../components/survey-results/survey-results';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyVote } from '../../models/survey-vote.model';
import { Supabase } from '../../services/supabase';
import { SurveyDataService } from '../../services/survey-data';
import { SurveySelectionService } from '../../services/survey-selection';
import { VotingStatusService } from '../../services/voting-status';
import { CreateSurvey } from '../create-survey/create-survey';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink, CreateSurvey, SurveyResults],
  providers: [SurveyDataService, SurveySelectionService],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {
  route: ActivatedRoute = inject(ActivatedRoute);
  supabase: Supabase = inject(Supabase);
  data: SurveyDataService = inject(SurveyDataService);
  selection: SurveySelectionService = inject(SurveySelectionService);
  votingStatus: VotingStatusService = inject(VotingStatusService);

  survey = this.data.survey;
  isCreateSurveyOpen = signal(false);
  showSaveError = signal(false);
  isSaving = signal(false);
  hasVoted = signal(false);

  routeSubscription: Subscription | null = null;
  showAnswerError: boolean = false;

  /** Loads the survey whenever its route ID changes. */
  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(
      (params: ParamMap): void => {
        void this.changeSurvey(params.get('id'));
      },
    );
  }

  /** Stops listening for route changes when leaving the page. */
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  /**
   * Resets the page and prepares the requested survey.
   * @param routeId - Survey ID read from the route.
   * @returns Resolves after the requested survey has been handled.
   */
  async changeSurvey(routeId: string | null): Promise<void> {
    this.resetState();
    const survey: SavedSurvey | null = await this.data.load(routeId);

    if (survey === null || this.survey() !== survey || this.data.isDestroyed) {
      return;
    }

    this.selection.initialize(survey);
    this.hasVoted.set(this.votingStatus.hasVoted(survey.id));
  }

  /** Clears selections, dialogs and submission messages. */
  resetState(): void {
    this.selection.answers = [];
    this.isCreateSurveyOpen.set(false);
    this.hasVoted.set(false);
    this.isSaving.set(false);
    this.showSaveError.set(false);
    this.showAnswerError = false;
  }

  /**
   * Updates the local selection while voting is allowed.
   * @param questionIndex - Zero-based question position.
   * @param answerIndex - Zero-based answer position.
   * @param isChecked - Whether the answer is selected.
   */
  selectAnswer(
    questionIndex: number,
    answerIndex: number,
    isChecked: boolean,
  ): void {
    const survey: SavedSurvey | null = this.survey();
    if (survey === null || this.isVotingBlocked()) {
      return;
    }
    if (survey.questions[questionIndex].multipleAnswers) {
      this.selection.selectMultiple(questionIndex, answerIndex, isChecked);
    } else {
      this.selection.selectSingle(questionIndex, answerIndex);
    }
  }

  /**
   * Checks whether changing or submitting answers is blocked.
   * @returns Whether voting is unavailable.
   */
  isVotingBlocked(): boolean {
    return (
      this.survey() === null ||
      this.isSaving() ||
      this.hasVoted() ||
      this.isSurveyExpired()
    );
  }

  /**
   * Checks the currently displayed survey's deadline.
   * @returns Whether the survey has expired.
   */
  isSurveyExpired(): boolean {
    return this.selection.isExpired(this.survey());
  }

  /**
   * Adds the unsaved selection to the displayed results while voting is allowed.
   * @returns Votes used only for displaying the results.
   */
  getResultVotes(): SurveyVote[] {
    const survey: SavedSurvey | null = this.survey();

    if (survey === null || this.isVotingBlocked()) {
      return this.data.votes();
    }

    return [...this.data.votes(), ...this.selection.createPreview(survey)];
  }

  /**
   * Validates all answers before starting the submission.
   * @returns Resolves after validation and any submission attempt finish.
   */
  async submitAnswers(): Promise<void> {
    const survey: SavedSurvey | null = this.survey();
    if (survey === null || this.isVotingBlocked()) {
      return;
    }
    this.showSaveError.set(false);
    this.showAnswerError = !this.selection.isComplete(survey);
    if (this.showAnswerError) {
      return;
    }
    await this.saveSubmission(survey);
  }

  /**
   * Saves the selected answers and handles the submission state.
   * @param survey - Survey to which the selected answers belong.
   * @returns Resolves after the submission and its feedback are handled.
   */
  async saveSubmission(survey: SavedSurvey): Promise<void> {
    const version: number = this.data.version;
    this.isSaving.set(true);

    try {
      await this.supabase.saveVotes(this.selection.createVotes(survey));
      this.votingStatus.markAsVoted(survey.id);
      await this.finishSubmission(survey, version);
    } catch (error: unknown) {
      this.handleSaveError(error, version);
    } finally {
      this.resetSavingState(version);
    }
  }

  /**
   * Locks a successful submission and refreshes its results.
   * @param survey - Successfully submitted survey.
   * @param version - Page version captured before saving.
   * @returns Resolves after refreshing results, or skips an outdated page.
   */
  async finishSubmission(
    survey: SavedSurvey,
    version: number,
  ): Promise<void> {
    if (this.data.isCurrent(version)) {
      this.hasVoted.set(true);
      await this.data.refreshVotes(survey, version);
    }
  }

  /**
   * Displays save errors only on the page that started the submission.
   * @param error - Error returned while saving.
   * @param version - Page version captured before saving.
   */
  handleSaveError(error: unknown, version: number): void {
    if (this.data.isCurrent(version)) {
      this.showSaveError.set(true);
    }

    console.error('Votes could not be saved:', error);
  }

  /**
   * Clears the saving state if the original survey is still displayed.
   * @param version - Page version captured before saving.
   */
  resetSavingState(version: number): void {
    if (this.data.isCurrent(version)) {
      this.isSaving.set(false);
    }
  }
}