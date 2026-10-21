import { inject, Injectable } from '@angular/core';
import { SurveyDraft } from '../types/survey-form.types';
import { SurveyDraftValidator } from './survey-draft-validator';

const SURVEY_DRAFT_KEY: string = 'poll-app-survey-draft';

@Injectable({
  providedIn: 'root',
})
export class SurveyDraftService {
  private validator: SurveyDraftValidator = inject(SurveyDraftValidator);

  /**
   * Stores the draft, including incomplete form values.
   * @param draft - Current survey form values.
   */
  save(draft: SurveyDraft): void {
    try {
      localStorage.setItem(SURVEY_DRAFT_KEY, JSON.stringify(draft));
    } catch (error: unknown) {
      console.error('Survey draft could not be saved:', error);
    }
  }

  /**
   * Reads the stored draft and checks its data types.
   * @returns A structurally valid draft, or null if unavailable or malformed.
   */
  load(): SurveyDraft | null {
    try {
      const storedDraft: string | null =
        localStorage.getItem(SURVEY_DRAFT_KEY);
      const draft: unknown =
        storedDraft === null ? null : JSON.parse(storedDraft);
      return this.validator.isDraft(draft) ? draft : null;
    } catch (error: unknown) {
      console.error('Survey draft could not be loaded:', error);
      return null;
    }
  }

  /** Removes the draft after a successful publication. */
  clear(): void {
    try {
      localStorage.removeItem(SURVEY_DRAFT_KEY);
    } catch (error: unknown) {
      console.error('Survey draft could not be removed:', error);
    }
  }
}