export interface StoryLanguage {
  name: string;
  color: string;
  percentage: number;
  sizeBytes?: number;
  repoCount?: number;
}

export interface StoryRepository {
  name: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  forks?: number;
  isOwner?: boolean;
}

export interface StoryContributionBreakdown {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
}

export interface StoryProductivity {
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night';
  peakHour: number;
  label: string;
}

export interface StoryCommunity {
  followers: number;
  following: number;
  totalStars: number;
  publicRepos: number;
}

export interface VelocityPoint {
  date: string;
  commits: number;
}

export interface StoryData {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  accountAgeYears: number;
  milestoneHorizon: string;
  totalCommits: number;
  longestStreak: number;
  busiestDay: string;
  busiestDayIndex: number;
  weekdayStats: number[];
  velocityData: VelocityPoint[];
  contributionGrid: { date: string; count: number }[];
  contributionBreakdown: StoryContributionBreakdown;
  topLanguages: StoryLanguage[];
  topRepos: StoryRepository[];
  flagshipRepo: StoryRepository;
  community: StoryCommunity;
  productivity: StoryProductivity;
  archetype: string;
  archetypeDescription: string;
}

export const SlideType = {
  GENESIS: 0,
  CADENCE: 1,
  CONSTELLATION: 2,
  ANATOMY: 3,
  ZENITH_DAY: 4,
  TEMPORAL_ORBIT: 5,
  ECHO: 6,
  SPECTRUM: 7,
  HALL_OF_FAME: 8,
  CROWN_JEWEL: 9,
  RECEIPT: 10,
} as const;

export type SlideType = (typeof SlideType)[keyof typeof SlideType];

export interface StorySlideProps {
  data: StoryData;
}

