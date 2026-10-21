import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, output, signal, viewChild, WritableSignal } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SurveyDetails } from '../../components/survey-details/survey-details';
import { SurveyQuestion } from '../../components/survey-question/survey-question';
import { SurveySuccess } from '../../components/survey-success/survey-success';
import { Survey } from '../../models/survey.model/survey.model';
import { Supabase } from '../../services/supabase';
import { SurveyDraftService } from '../../services/survey-draft';
import { SurveyFormService } from '../../services/survey-form';
import { QuestionForm, SurveyDraft, SurveyForm } from '../../types/survey-form.types';

const MIN_QUESTIONS: number = 1;
const SUCCESS_REDIRECT_DELAY: number = 2000;

@Component({
  selector: 'app-create-survey',
  imports: [ ReactiveFormsModule, SurveySuccess, SurveyQuestion, SurveyDetails ],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey implements OnInit, AfterViewInit, OnDestroy {
  supabase: Supabase = inject(Supabase);
  router: Router = inject(Router);
  formService: SurveyFormService = inject(SurveyFormService);
  draftService: SurveyDraftService = inject(SurveyDraftService);

  cancelled = output<void>();
  surveyDialog = viewChild.required<ElementRef<HTMLDialogElement>>('surveyDialog');

  surveyForm: SurveyForm = this.formService.createForm();
  questions: FormArray<QuestionForm> = this.surveyForm.controls.questions;

  maxTitleLength: number = this.formService.maxTitleLength;
  maxDescriptionLength: number = this.formService.maxDescriptionLength;
  maxQuestionLength: number = this.formService.maxQuestionLength;
  maxAnswerLength: number = this.formService.maxAnswerLength;
  maxAnswers: number = this.formService.maxAnswers;

  isSuccessOverlayOpen: WritableSignal<boolean> = signal(false);
  isSaving: WritableSignal<boolean> = signal(false);
  showSaveError: WritableSignal<boolean> = signal(false);

  pointerStartedOutside: boolean = false;
  createdSurveyId: number | null = null;
  redirectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Restores the draft before the form template is initialized. */
  ngOnInit(): void {
    this.restoreDraft();
  }

  /** Opens the dialog once its HTML element is available. */
  ngAfterViewInit(): void {
    this.surveyDialog().nativeElement.showModal();
  }

  /** Cancels the redirect when the component is removed. */
  ngOnDestroy(): void {
    this.clearRedirectTimer();
  }

  /** Saves the draft and closes the dialog unless publication is in progress. */
  cancelSurvey(): void {
    if (this.isSaving() || this.isSuccessOverlayOpen()) {
      return;
    }
    this.draftService.save(this.surveyForm.getRawValue());
    this.surveyDialog().nativeElement.close();
    this.cancelled.emit();
  }

  /**
   * Closes only when the interaction starts and ends outside the dialog.
   * @param event - Click used to check the interaction's ending position.
   */
  closeOnBackdropClick(event: MouseEvent): void {
    const shouldClose: boolean =
      this.pointerStartedOutside && this.isOutsideDialog(event);
    this.pointerStartedOutside = false;
    if (shouldClose) {
      this.cancelSurvey();
    }
  }

  /**
   * Records outside presses and prevents validation flashes before closing.
   * @param event - Pointer press starting the interaction.
   */
  rememberPointerStart(event: PointerEvent): void {
    this.pointerStartedOutside = this.isOutsideDialog(event);
    if (this.pointerStartedOutside) {
      event.preventDefault();
    }
  }

  /**
   * Checks the pointer position against the dialog's bounds.
   * @param event - Mouse or pointer event to inspect.
   * @returns Whether the event targets the dialog outside its visible bounds.
   */
  isOutsideDialog(event: MouseEvent): boolean {
    const dialog: HTMLDialogElement = this.surveyDialog().nativeElement;
    const bounds: DOMRect = dialog.getBoundingClientRect();
    return event.target === dialog && (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }

  /**
   * Validates the form and saves it when all required values are present.
   * @returns Resolves after validation and any save attempt have finished.
   */
  async submitSurvey(): Promise<void> {
    if (this.isSaving() || this.createdSurveyId !== null) {
      return;
    }
    this.surveyForm.controls.surveyDeadline.updateValueAndValidity();
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

  /** Adds a question with its initial answer controls. */
  addQuestion(): void {
    this.questions.push(this.formService.createQuestion());
  }

  /**
   * Removes a question or clears its text when only one remains.
   * @param questionIndex - Zero-based position of the question.
   */
  removeQuestion(questionIndex: number): void {
    if (this.questions.length > MIN_QUESTIONS) {
      this.questions.removeAt(questionIndex);
      return;
    }
    this.questions.at(questionIndex).controls.questionText.reset('');
  }

  /**
   * Returns the answer controls belonging to a question.
   * @param questionIndex - Zero-based position of the question.
   * @returns The question's answer array.
   */
  getAnswers(questionIndex: number): FormArray<FormControl<string>> {
    return this.questions.at(questionIndex).controls.answers;
  }

  /**
   * Adds an answer unless the maximum has been reached.
   * @param questionIndex - Zero-based position of the question.
   */
  addAnswer(questionIndex: number): void {
    const answers: FormArray<FormControl<string>> =
      this.getAnswers(questionIndex);
    if (answers.length < this.maxAnswers) {
      answers.push(this.formService.createAnswer());
    }
  }

  /**
   * Removes an answer or clears it when only the required minimum remains.
   * @param questionIndex - Zero-based position of the question.
   * @param answerIndex - Zero-based position of the answer.
   */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers: FormArray<FormControl<string>> =
      this.getAnswers(questionIndex);
    if (answers.length > this.formService.minAnswers) {
      answers.removeAt(answerIndex);
      return;
    }
    answers.at(answerIndex).reset('');
  }

  /**
   * Converts the form values into the model expected by Supabase.
   * @returns Survey data ready to save.
   */
  createSurveyData(): Survey {
    const values: SurveyDraft = this.surveyForm.getRawValue();
    return {
      title: values.surveyName,
      description: values.surveyDescription,
      category: values.surveyCategory,
      questions: values.questions,
      deadline: values.surveyDeadline || null,
    };
  }

  /**
   * Saves the survey and displays the confirmation after success.
   * @param survey - Validated survey data to publish.
   * @returns Resolves after the save attempt and its feedback are handled.
   */
  async saveSurvey(survey: Survey): Promise<void> {
    this.isSaving.set(true);
    this.showSaveError.set(false);
    try {
      this.createdSurveyId = await this.supabase.saveSurvey(survey);
      this.draftService.clear();
      this.showSuccess();
    } catch (error: unknown) {
      this.showSaveError.set(true);
      console.error('Survey could not be saved:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Displays the confirmation and schedules navigation to the survey. */
  showSuccess(): void {
    this.isSuccessOverlayOpen.set(true);
    this.redirectTimer = setTimeout(
      (): void => this.closeSuccessOverlay(),
      SUCCESS_REDIRECT_DELAY,
    );
  }

  /**
   * Provides the earliest selectable date to the template.
   * @returns Today's date in local YYYY-MM-DD format.
   */
  getTodayDate(): string {
    return this.formService.getTodayDate();
  }

  /** Restores saved form values when a usable draft exists. */
  restoreDraft(): void {
    const draft: SurveyDraft | null = this.draftService.load();
    if (draft === null) {
      return;
    }
    try {
      this.formService.applyDraft(this.surveyForm, draft);
    } catch (error: unknown) {
      console.error('Survey draft could not be restored:', error);
    }
  }
}