import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, output, signal, viewChild, WritableSignal } from '@angular/core';
import {
  FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Survey } from '../../models/survey.model/survey.model';
import { Supabase } from '../../services/supabase';

type SurveyCategory =
  | 'Team Activities'
  | 'Health & Wellness'
  | 'Gaming & Entertainment'
  | 'Education & Learning'
  | 'Lifestyle & Preferences'
  | 'Technology & Innovation';

type QuestionForm = FormGroup<{
  questionText: FormControl<string>;
  answers: FormArray<FormControl<string>>;
  multipleAnswers: FormControl<boolean>;
}>;

type SurveyForm = FormGroup<{
  surveyName: FormControl<string>;
  surveyDescription: FormControl<string>;
  surveyDeadline: FormControl<string>;
  questions: FormArray<QuestionForm>;
  surveyCategory: FormControl<SurveyCategory | ''>;
}>;

const MIN_ANSWERS: number = 2;
const MAX_ANSWERS: number = 6;
const MIN_QUESTIONS: number = 1;
const SUCCESS_REDIRECT_DELAY: number = 2000;
const MAX_TITLE_LENGTH: number = 100;
const MAX_DESCRIPTION_LENGTH: number = 1000;
const MAX_QUESTION_LENGTH: number = 200;
const MAX_ANSWER_LENGTH: number = 150;
const SURVEY_DRAFT_KEY: string = 'poll-app-survey-draft';

type SurveyDraft = ReturnType<SurveyForm['getRawValue']>;
type QuestionDraft = SurveyDraft['questions'][number];

@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey implements OnInit, AfterViewInit, OnDestroy {
  cancelled = output<void>();
  surveyDialog = viewChild.required<ElementRef<HTMLDialogElement>>('surveyDialog');
  redirectTimer: ReturnType<typeof setTimeout> | null = null;
  maxTitleLength: number = MAX_TITLE_LENGTH;
  maxDescriptionLength: number = MAX_DESCRIPTION_LENGTH;
  maxQuestionLength: number = MAX_QUESTION_LENGTH;
  maxAnswerLength: number = MAX_ANSWER_LENGTH;

  /** Restores the draft before the form template is initialized. */
  ngOnInit(): void {
    this.restoreDraft();
  }

  /** Opens the dialog once its HTML element is available. */
  ngAfterViewInit(): void {
    this.surveyDialog().nativeElement.showModal();
  }

  /** Closes the form unless saving or confirmation is in progress. */
  cancelSurvey(): void {
    if (this.isSaving || this.isSuccessOverlayOpen()) {
      return;
    }
    this.saveDraft();
    this.surveyDialog().nativeElement.close();
    this.cancelled.emit();
  }

  /** Closes only when the interaction starts and ends outside the dialog. */
  closeOnBackdropClick(event: MouseEvent): void {
    const shouldClose: boolean =
      this.pointerStartedOutside && this.isOutsideDialog(event);
    this.pointerStartedOutside = false;
    if (shouldClose) {
      this.cancelSurvey();
    }
  }

/** Tracks outside presses and prevents validation flashes before closing. */
rememberPointerStart(event: PointerEvent): void {
  this.pointerStartedOutside = this.isOutsideDialog(event);
  if (this.pointerStartedOutside) {
    event.preventDefault();
  }
}

  /** Checks whether the pointer is outside the dialog's bounds. */
  isOutsideDialog(event: MouseEvent): boolean {
    const dialog: HTMLDialogElement = this.surveyDialog().nativeElement;
    const bounds: DOMRect = dialog.getBoundingClientRect();
    return event.target === dialog && (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    );
  }

  supabase: Supabase = inject(Supabase);
  router: Router = inject(Router);
  isSaving: boolean = false;
  pointerStartedOutside: boolean = false;

  surveyName: FormControl<string> =
    this.createRequiredTextControl(MAX_TITLE_LENGTH);

  surveyDescription: FormControl<string> = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(MAX_DESCRIPTION_LENGTH)],
  });
  surveyDeadline: FormControl<string> = new FormControl('', {
    nonNullable: true,
    validators: [
      (control: AbstractControl): ValidationErrors | null =>
        this.validateDeadline(control.value),
    ],
  });
  questions: FormArray<QuestionForm> =
    new FormArray<QuestionForm>([this.createQuestionForm()]);
  selectedCategory: FormControl<SurveyCategory | ''> =
    new FormControl<SurveyCategory | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    });

  surveyForm: SurveyForm = new FormGroup({
    surveyName: this.surveyName,
    surveyDescription: this.surveyDescription,
    surveyDeadline: this.surveyDeadline,
    questions: this.questions,
    surveyCategory: this.selectedCategory,
  });

  isSuccessOverlayOpen: WritableSignal<boolean> = signal(false);
  answerLabels: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];

  createdSurveyId: number | null = null;
  isCategoryDropdownOpen: boolean = false;

  /** Validates the form and starts saving a new survey. */
  async submitSurvey(): Promise<void> {
    if (this.isSaving || this.createdSurveyId !== null) {
      return;
    }
    this.surveyDeadline.updateValueAndValidity();
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }
    await this.saveSurvey(this.createSurveyData());
  }

  /** Opens the created survey and cancels any pending redirect. */
  closeSuccessOverlay(): void {
    if (this.createdSurveyId === null) {
      return;
    }
    this.clearRedirectTimer();
    void this.router.navigate(['/survey', this.createdSurveyId]);
  }

  /** Cancels a scheduled redirect. */
  clearRedirectTimer(): void {
    if (this.redirectTimer !== null) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

  /** Cancels the redirect when the component is removed. */
  ngOnDestroy(): void {
    this.clearRedirectTimer();
  }

  /** Creates a question with its initial answers and selection mode. */
  createQuestionForm(): QuestionForm {
    return new FormGroup({
      questionText: this.createRequiredTextControl(MAX_QUESTION_LENGTH),
      answers: this.createInitialAnswers(),
      multipleAnswers: new FormControl(false, { nonNullable: true }),
    });
  }

  /** Adds an empty question to the survey. */
  addQuestion(): void {
    this.questions.push(this.createQuestionForm());
  }

  /** Returns the answer controls for a question. */
  getAnswers(questionIndex: number): FormArray<FormControl<string>> {
    return this.questions.at(questionIndex).controls.answers;
  }

  /** Adds an answer unless the maximum number has been reached. */
  addAnswer(questionIndex: number): void {
    const ANSWERS: FormArray<FormControl<string>> =
      this.getAnswers(questionIndex);
    if (ANSWERS.length < MAX_ANSWERS) {
      ANSWERS.push(this.createRequiredTextControl(MAX_ANSWER_LENGTH));
    }
  }

  /** Removes a question or clears its text if it is the last question. */
  removeQuestion(questionIndex: number): void {
    if (this.questions.length > MIN_QUESTIONS) {
      this.questions.removeAt(questionIndex);
      return;
    }
    this.questions.at(questionIndex).controls.questionText.reset('');
  }

  /** Removes an answer or clears its text at the required minimum. */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers: FormArray<FormControl<string>> =
      this.getAnswers(questionIndex);
    if (answers.length > MIN_ANSWERS) {
      answers.removeAt(answerIndex);
      return;
    }
    answers.at(answerIndex).reset('');
  }

  /** Toggles the category dropdown. */
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  /** Selects a category and closes the dropdown. */
  switchCategory(surveyCategory: SurveyCategory): void {
    this.selectedCategory.setValue(surveyCategory);
    this.isCategoryDropdownOpen = false;
  }

  /** Creates a required text control with a maximum length. */
  private createRequiredTextControl(maxLength: number): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(maxLength),
      ],
    });
  }

  /** Creates the minimum number of empty answer controls. */
  createInitialAnswers(): FormArray<FormControl<string>> {
    const ANSWERS: FormControl<string>[] = Array.from(
      { length: MIN_ANSWERS },
      (): FormControl<string> => this.createRequiredTextControl(MAX_ANSWER_LENGTH),
    );
    return new FormArray<FormControl<string>>(ANSWERS);
  }

  /** Converts the form values into the survey model. */
  createSurveyData(): Survey {
    const FORM_VALUE: ReturnType<SurveyForm['getRawValue']> =
      this.surveyForm.getRawValue();
    return {
      title: FORM_VALUE.surveyName,
      description: FORM_VALUE.surveyDescription,
      category: FORM_VALUE.surveyCategory,
      questions: FORM_VALUE.questions,
      deadline: FORM_VALUE.surveyDeadline || null,
    };
  }

  /** Saves the survey and opens the confirmation after success. */
  async saveSurvey(survey: Survey): Promise<void> {
    this.isSaving = true;
    try {
      this.createdSurveyId = await this.supabase.saveSurvey(survey);
      this.clearDraft();
      this.isSuccessOverlayOpen.set(true);
      this.redirectTimer = setTimeout(
        (): void => this.closeSuccessOverlay(),
        SUCCESS_REDIRECT_DELAY,
      );
    } catch (error: unknown) {
      console.error('Survey could not be saved:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /** Returns today's date in the local YYYY-MM-DD format. */
  getTodayDate(): string {
    const today: Date = new Date();
    const year: number = today.getFullYear();
    const month: string = String(today.getMonth() + 1).padStart(2, '0');
    const day: string = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Checks that the value represents an existing calendar date. */
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

  /** Allows an empty deadline or a valid date from today onward. */
  validateDeadline(value: string): ValidationErrors | null {
    if (value === '') {
      return null;
    }
    if (!this.isValidDate(value)) {
      return { invalidDate: true };
    }
    return value < this.getTodayDate() ? { pastDate: true } : null;
  }

  /** Stores the current form values, including incomplete inputs. */
  saveDraft(): void {
    try {
      const draft: SurveyDraft = this.surveyForm.getRawValue();
      localStorage.setItem(SURVEY_DRAFT_KEY, JSON.stringify(draft));
    } catch (error: unknown) {
      console.error('Survey draft could not be saved:', error);
    }
  }

  /** Restores a previously saved draft if it can be read. */
  restoreDraft(): void {
    try {
      const storedDraft: string | null = localStorage.getItem(SURVEY_DRAFT_KEY);
      if (storedDraft === null) {
        return;
      }
      const draft: SurveyDraft = JSON.parse(storedDraft);
      this.applyDraft(draft);
    } catch (error: unknown) {
      console.error('Survey draft could not be restored:', error);
    }
  }

  /** Rebuilds the question controls before restoring the form values. */
  applyDraft(draft: SurveyDraft): void {
    const restoredQuestions: QuestionForm[] = draft.questions.map(
      (question: QuestionDraft): QuestionForm => this.restoreQuestion(question),
    );
    if (restoredQuestions.length < MIN_QUESTIONS) {
      return;
    }
    this.surveyForm.setValue({ ...draft, questions: this.questions.getRawValue() });
    this.questions.clear();
    restoredQuestions.forEach((question: QuestionForm): void => {
      this.questions.push(question);
    });
  }

  /** Creates a question with the saved number of answer controls. */
  restoreQuestion(draft: QuestionDraft): QuestionForm {
    const question: QuestionForm = this.createQuestionForm();
    if (draft.answers.length < MIN_ANSWERS || draft.answers.length > MAX_ANSWERS) {
      throw new Error('Invalid answer count in survey draft.');
    }
    question.controls.answers.clear();
    draft.answers.forEach((): void => {
      question.controls.answers.push(this.createRequiredTextControl(MAX_ANSWER_LENGTH));
    });
    question.setValue(draft);
    return question;
  }

  /** Removes the draft after the survey has been published successfully. */
  clearDraft(): void {
    try {
      localStorage.removeItem(SURVEY_DRAFT_KEY);
    } catch (error: unknown) {
      console.error('Survey draft could not be removed:', error);
    }
  }
}