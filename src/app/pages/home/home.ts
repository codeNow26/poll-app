import { Component, OnInit } from '@angular/core';
import { SurveyCard } from '../../components/survey-card/survey-card';
import { Survey } from '../../models/survey.model/survey.model';

@Component({
  selector: 'app-home',
  imports: [SurveyCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

export class Home implements OnInit {
  surveys: Survey[] = [
    {
      category: 'Work',
      title: 'wie oft spielst du?',
      deadline: '2026-09-30',
    },
    {
      category: 'tiere',
      title: 'welche Haustiere hast du?',
      deadline: '2026-08-15',
    },
    {
      category: 'technologie',
      title: 'welche Technologien nutzt du am meisten?',
      deadline: '2026-09-04',
    },
    {
      category: 'beziehungen',
      title: 'wieviele Beziehungen hattest du bereits?',
      deadline: '2026-09-01',
    },
  ];

  endingSoonSurveys: Survey[] = []
  activeSurveys: Survey[] = [];
  pastSurveys: Survey[] = [];

  selectedTab: 'active' | 'past' = 'active';
  selectedCategory: 'All' | 'Work' | 'Events' | 'Feedback' = 'All';
  isCategoryDropdownOpen = false;

  switchSurveys(category: 'active' | 'past'): void {
    this.selectedTab = category;
  }

  switchCategory(button: 'All' | 'Work' | 'Events' | 'Feedback'): void {
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
      this.selectedCategory === 'All' ||
      survey.category === this.selectedCategory
    );
  }
}




