import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Survey } from '../../models/survey.model/survey.model';
import { SurveyQuestion } from '../../models/survey.model/survey-question.model';
import { Supabase } from '../../services/supabase';

type SurveyCategory =
  | 'Team Activities'
  | 'Health & Wellness'
  | 'Gaming & Entertainment'
  | 'Education & Learning'
  | 'Lifestyle & Preferences'
  | 'Technology & Innovation';

@Component({
  selector: 'app-create-survey',
  imports: [RouterLink, ReactiveFormsModule,],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})

export class CreateSurvey {
  surveyName = new FormControl('', [Validators.required, Validators.pattern(/\S/)]);
  surveyDescription = new FormControl('');
  surveyDeadline = new FormControl('');
  questions = new FormArray([this.createQuestionForm()]);
  selectedCategory = new FormControl<SurveyCategory | ''>('', Validators.required);
  supabase = inject(Supabase);

  surveyForm = new FormGroup({
    surveyName: this.surveyName,
    surveyDescription: this.surveyDescription,
    surveyDeadline: this.surveyDeadline,
    questions: this.questions,
    surveyCategory: this.selectedCategory,
  });

  submitSurvey(): void {
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }
    const formValue = this.surveyForm.getRawValue();

    const newSurvey: Survey = {
      title: formValue.surveyName ?? '',
      description: formValue.surveyDescription ?? '',
      category: formValue.surveyCategory ?? '',
      questions: formValue.questions as SurveyQuestion[],
      deadline: formValue.surveyDeadline || null,
    }
   this.supabase.saveSurvey(newSurvey);
  }

  createQuestionForm(): FormGroup {
    return new FormGroup({
      questionText: new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
      answers: new FormArray([
        new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
        new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
      ]),
      multipleAnswers: new FormControl(false)
    });
  }

  addQuestion(): void {
    this.questions.push(this.createQuestionForm());
  }

  getAnswers(questionIndex: number): FormArray {
    return this.questions
      .at(questionIndex)
      .get('answers') as FormArray;
  }

  addAnswer(questionIndex: number): void {
    const answerArray = this.getAnswers(questionIndex);

    if (answerArray.length < 6) {
      answerArray.push(new FormControl('', [Validators.required, Validators.pattern(/\S/)]));
    }
  }

  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answerArray = this.getAnswers(questionIndex);
    if (answerArray.length > 2) {
      answerArray.removeAt(answerIndex);
    }
  }

  removeQuestion(questionIndex: number): void {
    if (this.questions.length > 1) {
      this.questions.removeAt(questionIndex)
    }
  }

  isCategoryDropdownOpen = false;

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen
  }

  switchCategory(surveyCategory: SurveyCategory): void {
    this.selectedCategory.setValue(surveyCategory);
    this.isCategoryDropdownOpen = false;
  }

  answerLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
}
