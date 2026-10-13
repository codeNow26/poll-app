import { Component, OnInit, inject, signal } from '@angular/core';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { SavedSurvey } from '../../models/survey.model/survey.model';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-home',
  imports: [SurveyCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  supabase = inject(Supabase);

  surveys = signal<SavedSurvey[]>([]);
  endingSoonSurveys = signal<SavedSurvey[]>([]);
  activeSurveys = signal<SavedSurvey[]>([]);
  pastSurveys = signal<SavedSurvey[]>([]);

  isLoading = signal(true);
  showLoadError = signal(false);

  selectedTab: 'active' | 'past' = 'active';

  selectedCategory:
    | 'All Surveys'
    | 'Team Activities'
    | 'Health & Wellness'
    | 'Gaming & Entertainment'
    | 'Education & Learning'
    | 'Lifestyle & Preferences'
    | 'Technology & Innovation' = 'All Surveys';

  isCategoryDropdownOpen = false;

  switchSurveys(category: 'active' | 'past'): void {
    this.selectedTab = category;
  }

  switchCategory(
    button:
      | 'All Surveys'
      | 'Team Activities'
      | 'Health & Wellness'
      | 'Gaming & Entertainment'
      | 'Education & Learning'
      | 'Lifestyle & Preferences'
      | 'Technology & Innovation'
  ): void {
    this.selectedCategory = button;
    this.isCategoryDropdownOpen = false;
  }

  async ngOnInit(): Promise<void> {
    try {
      const surveys = await this.supabase.loadSurveys();
      this.surveys.set(surveys);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeSurveys = surveys.filter((survey) => {
        if (survey.deadline === null) {
          return true;
        }

        const deadline = new Date(survey.deadline + 'T00:00:00');
        return deadline >= today;
      });

      const pastSurveys = surveys.filter((survey) => {
        if (survey.deadline === null) {
          return false;
        }

        const deadline = new Date(survey.deadline + 'T00:00:00');
        return deadline < today;
      });

      activeSurveys.sort((a, b) => {
        if (a.deadline === null && b.deadline === null) {
          return 0;
        }

        if (a.deadline === null) {
          return 1;
        }

        if (b.deadline === null) {
          return -1;
        }

        return a.deadline.localeCompare(b.deadline);
      });

      this.activeSurveys.set(activeSurveys);
      this.pastSurveys.set(pastSurveys);

      const surveysWithDeadline = activeSurveys.filter((survey) => {
        return survey.deadline !== null;
      });

      this.endingSoonSurveys.set(surveysWithDeadline.slice(0, 3));
    } catch (error) {
      this.showLoadError.set(true);
      console.error('Umfragen konnten nicht geladen werden:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  getVisibleSurveys(): SavedSurvey[] {
    const surveysToFilter =
      this.selectedTab === 'active'
        ? this.activeSurveys()
        : this.pastSurveys();

    return surveysToFilter.filter((survey) =>
      this.selectedCategory === 'All Surveys' ||
      survey.category === this.selectedCategory
    );
  }
}