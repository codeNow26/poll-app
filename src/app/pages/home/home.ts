import { Component, OnInit, inject } from '@angular/core';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { Survey } from '../../models/survey.model/survey.model';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-home',
  imports: [SurveyCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

export class Home implements OnInit {
  surveys: Survey[] = [];

  supabase = inject(Supabase)
  endingSoonSurveys: Survey[] = []
  activeSurveys: Survey[] = [];
  pastSurveys: Survey[] = [];

  selectedTab: 'active' | 'past' = 'active';
  selectedCategory: 'All Surveys' | 'Team Activities' | 'Health & Wellness' | 'Gaming & Entertainment' | 'Education & Learning' | 'Lifestyle & Preferences' | 'Technology & Innovation' = 'All Surveys';

  isCategoryDropdownOpen = false;

  switchSurveys(category: 'active' | 'past'): void {
    this.selectedTab = category;
  }

  switchCategory(button: 'All Surveys' | 'Team Activities' | 'Health & Wellness' | 'Gaming & Entertainment' | 'Education & Learning' | 'Lifestyle & Preferences' | 'Technology & Innovation'): void {
    this.selectedCategory = button;
    this.isCategoryDropdownOpen = false;
  }

  async ngOnInit(): Promise<void> {


    try {
      this.surveys = await this.supabase.loadSurveys();
    } catch (error) {
      console.error('Umfragen konnten nicht geladen werden:', error);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.activeSurveys = this.surveys.filter((survey) => {
      if (survey.deadline === null) {
        return true;
      }
      const deadline = new Date(survey.deadline);
      return deadline >= today;
    });

    this.pastSurveys = this.surveys.filter((survey) => {
      if (survey.deadline === null) {
        return false;
      }
      const deadline = new Date(survey.deadline);
      return deadline < today;
    });




    this.activeSurveys.sort((a, b) => {
      if (a.deadline === null && b.deadline === null) {
        return 0;
      } if (a.deadline === null) {
        return 1;
      } if (b.deadline === null) {
        return -1;
      } else {
        return a.deadline.localeCompare(b.deadline);
      }
    });

    const surveysWithDeadline = this.activeSurveys.filter((survey) => {
      return survey.deadline !== null;
    });
    this.endingSoonSurveys = surveysWithDeadline.slice(0, 3);
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen
  }

  getVisibleSurveys(): Survey[] {
    const surveysToFilter =
      this.selectedTab === 'active'
        ? this.activeSurveys
        : this.pastSurveys;

    return surveysToFilter.filter((survey) =>
      this.selectedCategory === 'All Surveys' ||
      survey.category === this.selectedCategory
    );
  }
}
