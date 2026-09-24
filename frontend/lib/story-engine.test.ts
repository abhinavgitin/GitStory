import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeveloperArchetype,
  calculateProductivity,
  calculateWeekdayDistribution,
  buildStoryDataFromTelemetry,
  buildMockStoryData,
} from './story-calculator.ts';

describe('GitStory Calculation Engine', () => {
  it('identifies The Nocturne Artisan when peak hour is late night', () => {
    const result = calculateDeveloperArchetype({
      breakdown: { commits: 100, prs: 5, issues: 2, reviews: 1 },
      community: { followers: 10, totalStars: 5 },
      totalCommits: 100,
      productivity: { peakHour: 23 },
      weekdayStats: [10, 20, 20, 20, 10, 10, 10],
      longestStreak: 5,
    });
    assert.equal(result.archetype, 'The Nocturne Artisan');
    assert.match(result.description, /silence of the night/);
  });

  it('identifies The Dawn Vanguard when peak hour is early morning', () => {
    const result = calculateDeveloperArchetype({
      breakdown: { commits: 100, prs: 5, issues: 2, reviews: 1 },
      community: { followers: 10, totalStars: 5 },
      totalCommits: 100,
      productivity: { peakHour: 7 },
      weekdayStats: [10, 20, 20, 20, 10, 10, 10],
      longestStreak: 5,
    });
    assert.equal(result.archetype, 'The Dawn Vanguard');
    assert.match(result.description, /morning/);
  });

  it('identifies The Pull Request Maestro when PR or review ratio is high', () => {
    const result = calculateDeveloperArchetype({
      breakdown: { commits: 30, prs: 40, issues: 5, reviews: 25 },
      community: { followers: 10, totalStars: 5 },
      totalCommits: 30,
      productivity: { peakHour: 15 },
      weekdayStats: [5, 15, 15, 15, 15, 15, 20],
      longestStreak: 5,
    });
    assert.equal(result.archetype, 'The Pull Request Maestro');
  });

  it('identifies The Deep Thinker when issue ratio exceeds threshold', () => {
    const result = calculateDeveloperArchetype({
      breakdown: { commits: 40, prs: 5, issues: 20, reviews: 2 },
      community: { followers: 10, totalStars: 5 },
      totalCommits: 40,
      productivity: { peakHour: 14 },
      weekdayStats: [5, 10, 10, 10, 10, 10, 12],
      longestStreak: 5,
    });
    assert.equal(result.archetype, 'The Deep Thinker');
  });

  it('identifies The Weekend Pioneer when weekend ratio is dominant', () => {
    const result = calculateDeveloperArchetype({
      breakdown: { commits: 100, prs: 5, issues: 2, reviews: 1 },
      community: { followers: 10, totalStars: 5 },
      totalCommits: 100,
      productivity: { peakHour: 14 },
      weekdayStats: [35, 5, 5, 5, 5, 5, 40], // 75% on weekend
      longestStreak: 5,
    });
    assert.equal(result.archetype, 'The Weekend Pioneer');
  });

  it('correctly maps peak hour to timeOfDay and labels', () => {
    const morning = calculateProductivity([{ hour: 9, count: 50 }, { hour: 14, count: 20 }]);
    assert.equal(morning.timeOfDay, 'Morning');
    assert.equal(morning.peakHour, 9);

    const evening = calculateProductivity([{ hour: 19, count: 40 }, { hour: 11, count: 10 }]);
    assert.equal(evening.timeOfDay, 'Evening');
    assert.equal(evening.peakHour, 19);

    const night = calculateProductivity([{ hour: 2, count: 60 }]);
    assert.equal(night.timeOfDay, 'Late Night');
    assert.equal(night.peakHour, 2);
  });

  it('correctly calculates busiest day of the week', () => {
    const weekdayData = [
      { dayOfWeek: 0, dayName: 'Sunday', count: 10 },
      { dayOfWeek: 1, dayName: 'Monday', count: 20 },
      { dayOfWeek: 2, dayName: 'Tuesday', count: 30 },
      { dayOfWeek: 3, dayName: 'Wednesday', count: 95 },
      { dayOfWeek: 4, dayName: 'Thursday', count: 40 },
      { dayOfWeek: 5, dayName: 'Friday', count: 15 },
      { dayOfWeek: 6, dayName: 'Saturday', count: 10 },
    ];
    const distribution = calculateWeekdayDistribution(weekdayData);
    assert.equal(distribution.busiestDay, 'Wednesdays');
    assert.equal(distribution.busiestDayIndex, 3);
    assert.equal(distribution.weekdayStats[3], 95);
  });

  it('assembles a complete and valid StoryData structure without crashes', () => {
    const mock = buildMockStoryData('torvalds');
    assert.equal(mock.username, 'torvalds');
    assert.ok(mock.velocityData.length > 0);
    assert.ok(mock.topLanguages.length > 0);
    assert.ok(mock.topRepos.length > 0);
    assert.ok(mock.archetype.length > 0);
    assert.ok(mock.milestoneHorizon.length > 0);
  });
});
