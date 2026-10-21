import { inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { SavedSurvey } from '../models/survey.model/survey.model';
import { SurveyVote } from '../models/survey-vote.model';
import { VotesChannel } from '../types/votes-channel.type';
import { Supabase } from './supabase';

@Injectable()
export class SurveyDataService implements OnDestroy {
  supabase: Supabase = inject(Supabase);

  survey: WritableSignal<SavedSurvey | null> = signal(null);
  votes: WritableSignal<SurveyVote[]> = signal([]);

  channel: VotesChannel | null = null;
  version: number = 0;
  isDestroyed: boolean = false;

  /** Stops realtime updates when the detail page is destroyed. */
  ngOnDestroy(): void {
    this.isDestroyed = true;
    void this.removeChannel();
  }

  /**
   * Replaces the displayed survey and starts its realtime subscription.
   * @param routeId - Survey ID from the route.
   * @returns The loaded survey, or null if invalid, outdated or unavailable.
   */
  async load(routeId: string | null): Promise<SavedSurvey | null> {
    const version: number = ++this.version;
    this.survey.set(null);
    this.votes.set([]);
    await this.removeChannel();
    const surveyId: number = Number(routeId);

    if (
      !Number.isSafeInteger(surveyId) ||
      surveyId < 1 ||
      !this.isCurrent(version)
    ) {
      return null;
    }
    return this.fetchSurvey(surveyId, version);
  }

  /**
   * Checks whether an operation belongs to the current page load.
   * @param version - Version captured when the operation started.
   * @returns Whether the operation may still update the page.
   */
  isCurrent(version: number): boolean {
    return !this.isDestroyed && version === this.version;
  }

  /**
   * Retrieves a survey and connects its results.
   * @param surveyId - ID of the requested survey.
   * @param version - Version used to reject outdated responses.
   * @returns The survey, or null if loading failed or became outdated.
   */
  async fetchSurvey(
    surveyId: number,
    version: number,
  ): Promise<SavedSurvey | null> {
    try {
      const survey: SavedSurvey = await this.supabase.loadSurvey(surveyId);
      if (!this.isCurrent(version)) {
        return null;
      }
      this.survey.set(survey);
      this.subscribe(survey, version);
      return survey;
    } catch (error: unknown) {
      console.error('Survey could not be loaded:', error);
      return null;
    }
  }

  /**
   * Starts listening for votes and requests the initial results.
   * @param survey - Survey whose votes should be loaded.
   * @param version - Version belonging to this subscription.
   */
  subscribe(survey: SavedSurvey, version: number): void {
    this.channel = this.supabase.subscribeToVotes((): void => {
      if (this.isCurrent(version)) {
        void this.refreshVotes(survey, version);
      }
    });

    void this.refreshVotes(survey, version);
  }

  /**
   * Updates results without overwriting a different survey's state.
   * @param survey - Survey providing the question IDs.
   * @param version - Version used to reject outdated responses.
   * @returns Resolves after the results request is handled.
   */
  async refreshVotes(
    survey: SavedSurvey,
    version: number,
  ): Promise<void> {
    const questionIds: number[] = survey.questions.map(
      (question): number => question.id,
    );
    try {
      const votes: SurveyVote[] = await this.supabase.loadVotes(questionIds);
      if (this.isCurrent(version)) {
        this.votes.set(votes);
      }
    } catch (error: unknown) {
      console.error('Results could not be loaded:', error);
    }
  }

  /**
   * Removes the current realtime subscription.
   * @returns Resolves after cleanup is attempted, or skips a missing channel.
   */
  async removeChannel(): Promise<void> {
    const channel: VotesChannel | null = this.channel;
    this.channel = null;
    if (channel === null) {
      return;
    }
    try {
      await this.supabase.client.removeChannel(channel);
    } catch (error: unknown) {
      console.error('Realtime subscription could not be removed:', error);
    }
  }
}