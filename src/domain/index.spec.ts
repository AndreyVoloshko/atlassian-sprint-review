import {
  COMPLETED_STATUSES,
  DateRange,
  ISSUE_ORIGIN,
  Issue,
  Sprint,
  StoryPoints,
} from './index';

describe('domain', () => {
  it('StoryPoints.create should normalize invalid values to zero', () => {
    expect(StoryPoints.create(null).value).toBe(0);
    expect(StoryPoints.create(-3).value).toBe(0);
    expect(StoryPoints.create('abc').value).toBe(0);
  });

  it('StoryPoints.create should parse numeric strings', () => {
    expect(StoryPoints.create('3.5').value).toBe(3.5);
  });

  it('DateRange.create should throw when end before start', () => {
    expect(() =>
      DateRange.create(new Date('2026-01-02'), new Date('2026-01-01')),
    ).toThrow('DateRange end must be after start');
  });

  it('Issue should detect completion and compute epic label', () => {
    const issue = new Issue({
      key: 'PROJ-1',
      summary: '[TeamA] Implement API',
      status: 'Done',
      storyPoints: StoryPoints.create(3),
      epicKey: 'PROJ-100',
      epicSummary: '[TeamA] Platform',
      assignee: 'Alex',
      origin: ISSUE_ORIGIN.planned,
    });

    expect(COMPLETED_STATUSES.has('Done')).toBe(true);
    expect(issue.isCompleted()).toBe(true);
    expect(issue.epicLabel).toBe('PROJ-100: [TeamA] Platform');
  });

  it('Sprint should expose start/end getters', () => {
    const sprint = new Sprint({
      id: '1',
      name: 'Sprint 1',
      state: 'active',
      boardId: '10',
      goal: 'Ship',
      dateRange: DateRange.create(new Date('2026-01-01'), new Date('2026-01-14')),
    });

    expect(sprint.startDate.toISOString()).toContain('2026-01-01');
    expect(sprint.endDate.toISOString()).toContain('2026-01-14');
  });
});
