import { Injectable } from '@angular/core';
import { SavedSurvey } from '../models/survey.model/survey.model';
import { SurveyVote } from '../models/survey-vote.model';

@Injectable()
export class SurveySelectionService {
  answers: number[][] = [];

  /**
   * Creates an empty selection for every question.
   * @param survey - Survey being answered.
   */
  initialize(survey: SavedSurvey): void {
    this.answers = survey.questions.map((): number[] => []);
  }

  /**
   * Selects the only permitted answer for a single-choice question.
   * @param questionIndex - Zero-based question position.
   * @param answerIndex - Zero-based answer position.
   */
  selectSingle(questionIndex: number, answerIndex: number): void {
    this.answers[questionIndex] = [answerIndex];
  }

  /**
   * Adds or removes an answer without creating duplicate selections.
   * @param questionIndex - Zero-based question position.
   * @param answerIndex - Zero-based answer position.
   * @param isChecked - Whether the answer should be selected.
   */
  selectMultiple(questionIndex: number, answerIndex: number, isChecked: boolean): void {
    const answers: number[] = this.answers[questionIndex] ?? [];
    const remaining: number[] = answers.filter(
      (index: number): boolean => index !== answerIndex,
    );
    this.answers[questionIndex] = isChecked
      ? [...remaining, answerIndex]
      : remaining;
  }

  /**
   * Checks that every question has a selection.
   * @param survey - Survey containing the required questions.
   * @returns Whether every question has at least one selected answer.
   */
  isComplete(survey: SavedSurvey): boolean {
    return survey.questions.every(
      (_question, index: number): boolean => (this.answers[index]?.length ?? 0) > 0,
    );
  }

  /**
   * Builds vote records without sending them to the backend.
   * @param survey - Survey providing the question IDs.
   * @returns Vote records containing copies of the selected answer indices.
   */
  createVotes(survey: SavedSurvey): SurveyVote[] {
    return survey.questions.map(
      (question, index: number): SurveyVote => ({
        question_id: question.id,
        answer_indices: [...(this.answers[index] ?? [])],
      }),
    );
  }

  /**
   * Builds preview votes only for questions with a selection.
   * @param survey - Survey currently being answered.
   * @returns Temporary votes used for the result preview.
   */
  createPreview(survey: SavedSurvey): SurveyVote[] {
    return this.createVotes(survey).filter(
      (vote: SurveyVote): boolean => vote.answer_indices.length > 0,
    );
  }

  /**
   * Checks the deadline against the current local day.
   * @param survey - Survey whose deadline should be checked.
   * @returns Whether the survey ended before today.
   */
  isExpired(survey: SavedSurvey | null): boolean {
    if (survey === null || survey.deadline === null) {
      return false;
    }
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline: Date = new Date(survey.deadline + 'T00:00:00');
    return today > deadline;
  }
}