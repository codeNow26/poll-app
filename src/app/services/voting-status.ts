import { Injectable } from '@angular/core';

const VOTE_STORAGE_PREFIX: string = 'voted-survey-';

@Injectable({
  providedIn: 'root',
})
export class VotingStatusService {
  /**
   * Reads whether this browser has submitted the survey.
   * @param surveyId - ID of the survey.
   * @returns Whether a successful submission was stored locally.
   */
  hasVoted(surveyId: number): boolean {
    try {
      return localStorage.getItem(VOTE_STORAGE_PREFIX + surveyId) === 'true';
    } catch (error: unknown) {
      console.error('Voting status could not be read:', error);
      return false;
    }
  }

  /**
   * Records a successful submission in this browser.
   * @param surveyId - ID of the submitted survey.
   */
  markAsVoted(surveyId: number): void {
    try {
      localStorage.setItem(VOTE_STORAGE_PREFIX + surveyId, 'true');
    } catch (error: unknown) {
      console.error('Voting status could not be saved:', error);
    }
  }
}