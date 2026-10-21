import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { SavedSurvey } from '../models/survey.model/survey.model';
import { Supabase } from './supabase';

const ENDING_SOON_LIMIT: number = 3;

@Injectable()
export class SurveyOverviewService {
  supabase: Supabase = inject(Supabase);

  endingSoonSurveys: WritableSignal<SavedSurvey[]> = signal([]);
  activeSurveys: WritableSignal<SavedSurvey[]> = signal([]);
  pastSurveys: WritableSignal<SavedSurvey[]> = signal([]);

  isLoading: WritableSignal<boolean> = signal(true);
  showLoadError: WritableSignal<boolean> = signal(false);

  /**
   * Loads the surveys and separates active and expired entries.
   * @returns Resolves after loading succeeds or its error is handled.
   */
  async load(): Promise<void> {
    this.isLoading.set(true);
    this.showLoadError.set(false);

    try {
      const surveys: SavedSurvey[] = await this.supabase.loadSurveys();
      this.groupSurveys(surveys);
    } catch (error: unknown) {
      this.showLoadError.set(true);
      console.error('Surveys could not be loaded:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Groups surveys and sorts active entries by their deadline.
   * @param surveys - Surveys loaded from the backend.
   */
  groupSurveys(surveys: SavedSurvey[]): void {
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    const activeSurveys: SavedSurvey[] = surveys.filter(
      (survey: SavedSurvey): boolean => !this.isExpired(survey, today),
    );
    this.pastSurveys.set(
      surveys.filter(
        (survey: SavedSurvey): boolean => this.isExpired(survey, today),
      ),
    );
    activeSurveys.sort(this.compareDeadlines);
    this.activeSurveys.set(activeSurveys);
    this.updateEndingSoon(activeSurveys);
  }

  /**
   * Checks whether a survey ended before the supplied day.
   * @param survey - Survey whose deadline should be checked.
   * @param today - Current local day at midnight.
   * @returns Whether the survey has expired.
   */
  isExpired(survey: SavedSurvey, today: Date): boolean {
    if (survey.deadline === null) {
      return false;
    }

    return new Date(survey.deadline + 'T00:00:00') < today;
  }

  /**
   * Orders surveys by deadline, placing entries without a deadline last.
   * @param first - First survey being compared.
   * @param second - Second survey being compared.
   * @returns A negative value, zero or a positive value for the sort order.
   */
  compareDeadlines(first: SavedSurvey, second: SavedSurvey): number {
    if (first.deadline === null && second.deadline === null) {
      return 0;
    }

    if (first.deadline === null) {
      return 1;
    }

    if (second.deadline === null) {
      return -1;
    }

    return first.deadline.localeCompare(second.deadline);
  }

  /**
   * Selects the first upcoming surveys from the sorted active list.
   * @param activeSurveys - Active surveys sorted by deadline.
   */
  updateEndingSoon(activeSurveys: SavedSurvey[]): void {
    this.endingSoonSurveys.set(
      activeSurveys
        .filter(
          (survey: SavedSurvey): boolean => survey.deadline !== null,
        )
        .slice(0, ENDING_SOON_LIMIT),
    );
  }
}