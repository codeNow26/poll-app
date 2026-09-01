import { Component, OnInit } from '@angular/core';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { Survey } from '../../models/survey.model/survey.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [SurveyCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

export class Home implements OnInit {
  surveys: Survey[] = [
    {
      category: 'Gaming & Entertainment',
      title: 'wie oft spielst du?',
      deadline: '2026-09-30',
    },
    {
      category: 'Team Activities',
      title: 'welche Haustiere hast du?',
      deadline: '2026-08-15',
    },
    {
      category: 'Technology & Innovation',
      title: 'welche Technologien nutzt du am meisten?',
      deadline: '2026-09-04',
    },
    {
      category: 'Health & Wellness',
      title: 'wieviele Beziehungen hattest du bereits?',
      deadline: '2026-09-01',
    },
  ];

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

  ngOnInit(): void {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.activeSurveys = this.surveys.filter((survey) => {
      const deadline = new Date(survey.deadline);
      return deadline >= today;
    });

    this.pastSurveys = this.surveys.filter((survey) => {
      const deadline = new Date(survey.deadline);
      return deadline < today;
    });

    this.activeSurveys.sort((a, b) => a.deadline.localeCompare(b.deadline));
    this.endingSoonSurveys = this.activeSurveys.slice(0, 3);
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




