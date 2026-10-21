import { Injectable } from '@angular/core';
import { FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { SurveyCategory } from '../types/survey-category.type';
import { QuestionDraft, QuestionForm, SurveyDraft, SurveyForm } from '../types/survey-form.types';

const MIN_ANSWERS: number = 2;
const MAX_ANSWERS: number = 6;
const MAX_TITLE_LENGTH: number = 100;
const MAX_DESCRIPTION_LENGTH: number = 1000;
const MAX_QUESTION_LENGTH: number = 200;
const MAX_ANSWER_LENGTH: number = 150;

@Injectable({
  providedIn: 'root',
})
export class SurveyFormService {
  minAnswers: number = MIN_ANSWERS;
  maxAnswers: number = MAX_ANSWERS;
  maxTitleLength: number = MAX_TITLE_LENGTH;
  maxDescriptionLength: number = MAX_DESCRIPTION_LENGTH;
  maxQuestionLength: number = MAX_QUESTION_LENGTH;
  maxAnswerLength: number = MAX_ANSWER_LENGTH;

  /**
   * Creates the complete survey form with one initial question.
   * @returns A new survey form with its validators.
   */
  createForm(): SurveyForm {
    return new FormGroup({
      surveyName: this.createRequiredTextControl(this.maxTitleLength),
      surveyDescription: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(this.maxDescriptionLength)],
      }),
      surveyDeadline: this.createDeadlineControl(),
      questions: new FormArray<QuestionForm>([this.createQuestion()]),
      surveyCategory: new FormControl<SurveyCategory | ''>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  /**
   * Creates a question with two empty answers.
   * @returns A new question form.
   */
  createQuestion(): QuestionForm {
    return new FormGroup({
      questionText: this.createRequiredTextControl(this.maxQuestionLength),
      answers: new FormArray<FormControl<string>>(
        Array.from(
          { length: this.minAnswers },
          (): FormControl<string> => this.createAnswer(),
        ),
      ),
      multipleAnswers: new FormControl(false, { nonNullable: true }),
    });
  }

  /**
   * Creates an answer with the shared text validators.
   * @returns An empty answer control.
   */
  createAnswer(): FormControl<string> {
    return this.createRequiredTextControl(this.maxAnswerLength);
  }

  /**
   * Creates a required text field with a character limit.
   * @param maxLength - Maximum permitted number of characters.
   * @returns A control rejecting empty and whitespace-only values.
   */
  createRequiredTextControl(maxLength: number): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(maxLength),
      ],
    });
  }

  /**
   * Creates an optional deadline with date validation.
   * @returns An empty deadline control.
   */
  createDeadlineControl(): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [
        (control): ValidationErrors | null =>
          this.validateDeadline(control.value),
      ],
    });
  }

  /**
   * Formats today's date using the local time zone.
   * @returns Today's date in YYYY-MM-DD format.
   */
  getTodayDate(): string {
    const today: Date = new Date();
    const year: number = today.getFullYear();
    const month: string = String(today.getMonth() + 1).padStart(2, '0');
    const day: string = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Checks whether a value represents an existing calendar date.
   * @param value - Date string to check.
   * @returns Whether the date exists and uses YYYY-MM-DD format.
   */
  isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date: Date = new Date(value + 'T00:00:00');
    const [year, month, day] = value.split('-').map(Number);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
  }

  /**
   * Allows an empty deadline or a valid date from today onward.
   * @param value - Current deadline value.
   * @returns A validation error, or null for an accepted value.
   */
  validateDeadline(value: unknown): ValidationErrors | null {
    if (value === '') {
      return null;
    }
    if (typeof value !== 'string' || !this.isValidDate(value)) {
      return { invalidDate: true };
    }
    return value < this.getTodayDate() ? { pastDate: true } : null;
  }

  /**
   * Restores a draft after rebuilding and checking its questions.
   * @param form - Existing form that should receive the draft.
   * @param draft - Stored values with validated data types.
   */
  applyDraft(form: SurveyForm, draft: SurveyDraft): void {
    const questions: QuestionForm[] = draft.questions.map(
      (question): QuestionForm => this.restoreQuestion(question),
    );
    form.controls.questions.clear();
    questions.forEach((question: QuestionForm): void => {
      form.controls.questions.push(question);
    });
    form.setValue(draft);
    form.markAsPristine();
    form.markAsUntouched();
  }

  /**
   * Rebuilds the controls needed for a stored question.
   * @param draft - Saved question fields.
   * @returns A question form containing the saved answers.
   */
  private restoreQuestion(draft: QuestionDraft): QuestionForm {
    if (draft.answers.length < this.minAnswers ||
      draft.answers.length > this.maxAnswers) {
      throw new Error('Invalid answer count in survey draft.');
    }
    const question: QuestionForm = this.createQuestion();
    question.controls.answers.clear();
    draft.answers.forEach((): void => {
      question.controls.answers.push(this.createAnswer());
    });
    question.setValue(draft);
    return question;
  }
}