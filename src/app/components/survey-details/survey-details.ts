import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SURVEY_CATEGORIES, SurveyCategory } from '../../types/survey-category.type';
import { SurveyForm } from '../../types/survey-form.types';

@Component({
  selector: 'app-survey-details',
  imports: [ReactiveFormsModule],
  templateUrl: './survey-details.html',
  styleUrl: './survey-details.scss',
})
export class SurveyDetails {
  form = input.required<SurveyForm>();
  maxTitleLength = input.required<number>();
  maxDescriptionLength = input.required<number>();
  minimumDate = input.required<string>();

  categories = SURVEY_CATEGORIES;
  isCategoryDropdownOpen: boolean = false;

  /**
   * Updates the selected category and closes the dropdown.
   * @param category - Category selected from the dropdown.
   */
  selectCategory(category: SurveyCategory): void {
    this.form().controls.surveyCategory.setValue(category);
    this.isCategoryDropdownOpen = false;
  }
}