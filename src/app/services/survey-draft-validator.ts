import { Injectable } from '@angular/core';
import { SURVEY_CATEGORIES } from '../types/survey-category.type';
import { QuestionDraft, SurveyDraft } from '../types/survey-form.types';

@Injectable({
  providedIn: 'root',
})
export class SurveyDraftValidator {
  /**
   * Checks stored draft types while allowing incomplete form values.
   * @param value - Parsed browser storage value.
   * @returns Whether the value has the expected draft structure.
   */
  isDraft(value: unknown): value is SurveyDraft {
    if (!this.isRecord(value)) {
      return false;
    }
    return (
      typeof value['surveyName'] === 'string' &&
      typeof value['surveyDescription'] === 'string' &&
      typeof value['surveyDeadline'] === 'string' &&
      this.isCategory(value['surveyCategory']) &&
      Array.isArray(value['questions']) &&
      value['questions'].length > 0 &&
      value['questions'].every((question: unknown) => this.isQuestion(question))
    );
  }

  /**
   * Checks the stored fields of one question.
   * @param value - Question value read from storage.
   * @returns Whether text, answers and selection mode have valid types.
   */
  private isQuestion(value: unknown): value is QuestionDraft {
    return (
      this.isRecord(value) &&
      typeof value['questionText'] === 'string' &&
      typeof value['multipleAnswers'] === 'boolean' &&
      Array.isArray(value['answers']) &&
      value['answers'].every((answer: unknown) => typeof answer === 'string')
    );
  }

  /**
   * Checks the category without rejecting an unfinished selection.
   * @param value - Stored category value.
   * @returns Whether the category is empty or supported by the form.
   */
  private isCategory(value: unknown): boolean {
    return value === '' ||
      SURVEY_CATEGORIES.some((category) => category === value);
  }

  /**
   * Excludes null, arrays and primitive values before accessing properties.
   * @param value - Unknown storage value.
   * @returns Whether named properties can be inspected safely.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}