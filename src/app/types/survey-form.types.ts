import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { SurveyCategory } from './survey-category.type';

export type QuestionForm = FormGroup<{
  questionText: FormControl<string>;
  answers: FormArray<FormControl<string>>;
  multipleAnswers: FormControl<boolean>;
}>;

export type SurveyForm = FormGroup<{
  surveyName: FormControl<string>;
  surveyDescription: FormControl<string>;
  surveyDeadline: FormControl<string>;
  questions: FormArray<QuestionForm>;
  surveyCategory: FormControl<SurveyCategory | ''>;
}>;

export type SurveyDraft = ReturnType<SurveyForm['getRawValue']>;

export type QuestionDraft = SurveyDraft['questions'][number];