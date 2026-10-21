import { Component, ElementRef, inject, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeHero } from '../../components/home-hero/home-hero';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { SurveyOverviewService } from '../../services/survey-overview';
import { CategoryFilter, SurveyTab } from '../../types/survey-filter.types';
import { CreateSurvey } from '../create-survey/create-survey';

const CATEGORY_MENU_MAX_HEIGHT: number = 260;
const CATEGORY_MENU_GAP: number = 4;
const VIEWPORT_BOTTOM_SPACING: number = 12;

@Component({
  selector: 'app-home',
  imports: [SurveyCard, RouterLink, CreateSurvey, HomeHero],
  providers: [SurveyOverviewService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  host: {
    '(window:resize)': 'updateCategoryMenuHeight()',
    '(window:scroll)': 'updateCategoryMenuHeight()',
  },
})
export class Home implements OnInit {
  overview: SurveyOverviewService = inject(SurveyOverviewService);

  endingSoonSurveys = this.overview.endingSoonSurveys;
  activeSurveys = this.overview.activeSurveys;
  pastSurveys = this.overview.pastSurveys;
  isLoading = this.overview.isLoading;
  showLoadError = this.overview.showLoadError;

  categoryTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('categoryTrigger');
  categoryMenuHeight: WritableSignal<number> =
    signal(CATEGORY_MENU_MAX_HEIGHT);
  isCreateSurveyOpen: WritableSignal<boolean> = signal(false);

  selectedTab: SurveyTab = 'active';
  selectedCategory: CategoryFilter = 'All Surveys';
  isCategoryDropdownOpen: boolean = false;

  categories: CategoryFilter[] = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  /**
   * Loads the surveys when the home page opens.
   * @returns Resolves after the initial survey load finishes.
   */
  async ngOnInit(): Promise<void> {
    await this.overview.load();
  }

  /**
   * Switches between active and expired surveys.
   * @param tab - Survey group to display.
   */
  switchSurveys(tab: SurveyTab): void {
    this.selectedTab = tab;
  }

  /**
   * Applies a category filter and closes the dropdown.
   * @param category - Category to display, or All Surveys.
   */
  switchCategory(category: CategoryFilter): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  /** Toggles the dropdown and measures the available space below it. */
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.updateCategoryMenuHeight();
  }

  /** Limits the open menu to the available viewport height. */
  updateCategoryMenuHeight(): void {
    const trigger: HTMLButtonElement | undefined =
      this.categoryTrigger()?.nativeElement;
    if (!this.isCategoryDropdownOpen || !trigger) {
      return;
    }
    const availableHeight: number =
      window.innerHeight -
      trigger.getBoundingClientRect().bottom -
      CATEGORY_MENU_GAP -
      VIEWPORT_BOTTOM_SPACING;
    this.categoryMenuHeight.set(
      Math.max(0, Math.min(CATEGORY_MENU_MAX_HEIGHT, availableHeight)),
    );
  }

  /**
   * Filters the currently selected survey group.
   * @returns Surveys matching the selected tab and category.
   */
  getVisibleSurveys(): SavedSurvey[] {
    const surveys: SavedSurvey[] =
      this.selectedTab === 'active'
        ? this.activeSurveys()
        : this.pastSurveys();

    return surveys.filter(
      (survey: SavedSurvey): boolean =>
        this.selectedCategory === 'All Surveys' ||
        survey.category === this.selectedCategory,
    );
  }
}