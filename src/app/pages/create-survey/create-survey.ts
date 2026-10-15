import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-create-survey',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private supabase: Supabase = inject(Supabase);
  private router: Router = inject(Router);
  private isSaving: boolean = false;

  surveyName: FormControl<string> = this.createRequiredTextControl();
  surveyDescription: FormControl<string> =
    new FormControl('', { nonNullable: true });
  surveyDeadline: FormControl<string> =
    new FormControl('', { nonNullable: true });
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
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }
    await this.saveSurvey(this.createSurveyData());
  }

  /** Opens the newly created survey after the confirmation is closed. */
  closeSuccessOverlay(): void {
    if (this.createdSurveyId === null) {
      return;
    }
    void this.router.navigate(['/survey', this.createdSurveyId]);
  }

  /** Creates a question with its initial answers and selection mode. */
  createQuestionForm(): QuestionForm {
    return new FormGroup({
      questionText: this.createRequiredTextControl(),
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
      ANSWERS.push(this.createRequiredTextControl());
    }
  }

  /** Removes an answer while keeping the required minimum. */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    const ANSWERS: FormArray<FormControl<string>> =
      this.getAnswers(questionIndex);
    if (ANSWERS.length > MIN_ANSWERS) {
      ANSWERS.removeAt(answerIndex);
    }
  }

  /** Removes a question while keeping at least one question. */
  removeQuestion(questionIndex: number): void {
    if (this.questions.length > MIN_QUESTIONS) {
      this.questions.removeAt(questionIndex);
    }
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

  /** Creates a text control that rejects empty and whitespace-only values. */
  private createRequiredTextControl(): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    });
  }

  /** Creates the minimum number of empty answer controls. */
  private createInitialAnswers(): FormArray<FormControl<string>> {
    const ANSWERS: FormControl<string>[] = Array.from(
      { length: MIN_ANSWERS },
      (): FormControl<string> => this.createRequiredTextControl(),
    );
    return new FormArray<FormControl<string>>(ANSWERS);
  }

  /** Converts the form values into the survey model. */
  private createSurveyData(): Survey {
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
  private async saveSurvey(survey: Survey): Promise<void> {
    this.isSaving = true;
    try {
      this.createdSurveyId = await this.supabase.saveSurvey(survey);
      this.isSuccessOverlayOpen.set(true);
    } catch (error: unknown) {
      console.error('Survey could not be saved:', error);
    } finally {
      this.isSaving = false;
    }
  }
}