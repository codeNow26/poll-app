import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { Supabase } from '../../services/supabase';

type SurveyTab = 'active' | 'past';
type CategoryFilter =
  | 'All Surveys'
  | 'Team Activities'
  | 'Health & Wellness'
  | 'Gaming & Entertainment'
  | 'Education & Learning'
  | 'Lifestyle & Preferences'
  | 'Technology & Innovation';

const ENDING_SOON_LIMIT: number = 3;

@Component({
  selector: 'app-home',
  imports: [SurveyCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

export class Home implements OnInit {
  supabase: Supabase = inject(Supabase);
  surveys: WritableSignal<SavedSurvey[]> =
    signal<SavedSurvey[]>([]);
  endingSoonSurveys: WritableSignal<SavedSurvey[]> =
    signal<SavedSurvey[]>([]);
  activeSurveys: WritableSignal<SavedSurvey[]> =
    signal<SavedSurvey[]>([]);
  pastSurveys: WritableSignal<SavedSurvey[]> =
    signal<SavedSurvey[]>([]);

  isLoading: WritableSignal<boolean> = signal(true);
  showLoadError: WritableSignal<boolean> = signal(false);

  selectedTab: SurveyTab = 'active';
  selectedCategory: CategoryFilter = 'All Surveys';
  isCategoryDropdownOpen: boolean = false;

  /** Loads and groups the surveys when the home page opens. */
  async ngOnInit(): Promise<void> {
    try {
      const LOADED_SURVEYS: SavedSurvey[] =
        await this.supabase.loadSurveys();
      this.surveys.set(LOADED_SURVEYS);
      this.groupSurveys(LOADED_SURVEYS);
    } catch (error: unknown) {
      this.showLoadError.set(true);
      console.error('Surveys could not be loaded:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Switches between active and past surveys. */
  switchSurveys(tab: SurveyTab): void {
    this.selectedTab = tab;
  }

  /** Selects a category filter and closes the dropdown. */
  switchCategory(category: CategoryFilter): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  /** Toggles the category dropdown. */
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  /** Returns surveys matching the selected tab and category. */
  getVisibleSurveys(): SavedSurvey[] {
    const SURVEYS_TO_FILTER: SavedSurvey[] =
      this.selectedTab === 'active'
        ? this.activeSurveys()
        : this.pastSurveys();
    return SURVEYS_TO_FILTER.filter(
      (survey: SavedSurvey): boolean =>
        this.selectedCategory === 'All Surveys' ||
        survey.category === this.selectedCategory,
    );
  }

  /** Separates active and expired surveys using today's local date. */
  groupSurveys(surveys: SavedSurvey[]): void {
    const TODAY: Date = this.getToday();
    const ACTIVE_SURVEYS: SavedSurvey[] = surveys.filter(
      (survey: SavedSurvey): boolean => !this.isExpired(survey, TODAY),
    );
    const PAST_SURVEYS: SavedSurvey[] = surveys.filter(
      (survey: SavedSurvey): boolean => this.isExpired(survey, TODAY),
    );
    ACTIVE_SURVEYS.sort(this.compareDeadlines);
    this.activeSurveys.set(ACTIVE_SURVEYS);
    this.pastSurveys.set(PAST_SURVEYS);
    this.updateEndingSoonSurveys(ACTIVE_SURVEYS);
  }

  /** Returns today's date at local midnight. */
  getToday(): Date {
    const TODAY: Date = new Date();
    TODAY.setHours(0, 0, 0, 0);
    return TODAY;
  }

  /** Checks whether a survey's deadline is before today. */
  isExpired(survey: SavedSurvey, today: Date): boolean {
    if (survey.deadline === null) {
      return false;
    }
    const DEADLINE: Date = new Date(survey.deadline + 'T00:00:00');
    return DEADLINE < today;
  }

  /** Sorts by earliest deadline, placing surveys without deadlines last. */
  compareDeadlines(first: SavedSurvey, second: SavedSurvey): number {
    if (first.deadline === null && second.deadline === null) {
      return 0;
    }
    if (first.deadline === null) {
      return 1;
    }
    if (second.deadline === null) {
      return -1;
    }
    return first.deadline.localeCompare(second.deadline);
  }

  /** Selects the first upcoming surveys from the sorted active list. */
  updateEndingSoonSurveys(activeSurveys: SavedSurvey[]): void {
    const SURVEYS_WITH_DEADLINE: SavedSurvey[] = activeSurveys.filter(
      (survey: SavedSurvey): boolean => survey.deadline !== null,
    );
    this.endingSoonSurveys.set(
      SURVEYS_WITH_DEADLINE.slice(0, ENDING_SOON_LIMIT),
    );
  }
}