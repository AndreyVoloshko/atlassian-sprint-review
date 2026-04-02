import { DateRange, ISSUE_ORIGIN, Sprint, SprintNotFoundError } from '../domain';
import type {
  CachedValue,
  IIssueRepository,
  ISprintRepository,
  IStoragePort,
  RawIssueData,
} from '../domain';
import { ComputeSprintStats, GetSprintList, classifyIssueOrigin } from './index';

describe('usecases', () => {
  it('classifyIssueOrigin should classify by earliest sprint changelog entry', () => {
    const start = new Date('2026-01-10T00:00:00Z');
    const origin = classifyIssueOrigin(
      'PROJ-1',
      [
        {
          issueKey: 'PROJ-1',
          fieldId: 'customfield_10200',
          fromString: null,
          toString: 'Sprint 42',
          created: '2026-01-09T10:00:00Z',
        },
      ],
      'Sprint 42',
      start,
    );

    expect(origin).toBe(ISSUE_ORIGIN.planned);
  });

  it('GetSprintList should sort sprints descending by start date', async () => {
    const sprintRepo: ISprintRepository = {
      async getSprintsForBoard(): Promise<Sprint[]> {
        return [
          new Sprint({
            id: '1',
            name: 'Older',
            state: 'closed',
            boardId: 'b1',
            goal: '',
            dateRange: DateRange.create(
              new Date('2026-01-01'),
              new Date('2026-01-10'),
            ),
          }),
          new Sprint({
            id: '2',
            name: 'Newer',
            state: 'active',
            boardId: 'b1',
            goal: '',
            dateRange: DateRange.create(
              new Date('2026-02-01'),
              new Date('2026-02-10'),
            ),
          }),
        ];
      },
      async getSprintById(): Promise<Sprint | null> {
        return null;
      },
    };

    const list = await new GetSprintList({ sprintRepo }).execute({ boardId: 'b1' });
    expect(list.map((s) => s.id)).toEqual(['2', '1']);
  });

  it('ComputeSprintStats should return cached value when fresh', async () => {
    const cachedValue = {
      sprint: {
        id: 's1',
        name: 'S1',
        state: 'active',
        goal: '',
        startDate: new Date('2026-01-01').toISOString(),
        endDate: new Date('2026-01-10').toISOString(),
      },
      totals: {
        plannedSp: 0,
        addedSp: 0,
        completedSp: 0,
        completedPlannedSp: 0,
        completedAddedSp: 0,
        plannedTickets: 0,
        addedTickets: 0,
        completedTickets: 0,
        completedPlannedTickets: 0,
        completedAddedTickets: 0,
        plannedCompletionRate: 0,
        addedCompletionRate: 0,
        totalCompletionRate: 0,
      },
      epicBreakdowns: [],
      tickets: [],
    };

    const sprintRepo: ISprintRepository = {
      getSprintsForBoard: async () => [],
      getSprintById: async () => {
        throw new Error('should not be called');
      },
    };
    const issueRepo: IIssueRepository = {
      getIssuesForSprint: async () => [],
      getChangelogs: async () => [],
    };
    const storage: IStoragePort = {
      get: async <T>(): Promise<CachedValue<T> | null> =>
        ({
          data: cachedValue,
          computedAt: new Date().toISOString(),
        }) as CachedValue<T>,
      set: async () => undefined,
      delete: async () => undefined,
    };

    const result = await new ComputeSprintStats({
      sprintRepo,
      issueRepo,
      storage,
    }).execute({ boardId: 'b1', sprintId: 's1' });

    expect(result).toEqual(cachedValue);
  });

  it('ComputeSprintStats should throw SprintNotFoundError when sprint missing', async () => {
    const sprintRepo: ISprintRepository = {
      getSprintsForBoard: async () => [],
      getSprintById: async () => null,
    };
    const issueRepo: IIssueRepository = {
      getIssuesForSprint: async () => [],
      getChangelogs: async () => [],
    };
    const storage: IStoragePort = {
      get: async () => null,
      set: async () => undefined,
      delete: async () => undefined,
    };

    await expect(
      new ComputeSprintStats({ sprintRepo, issueRepo, storage }).execute({
        boardId: 'b1',
        sprintId: 'missing',
      }),
    ).rejects.toBeInstanceOf(SprintNotFoundError);
  });

  it('ComputeSprintStats should compute totals for planned and added work', async () => {
    const sprint = new Sprint({
      id: 's1',
      name: 'Sprint 42',
      state: 'active',
      boardId: 'b1',
      goal: '',
      dateRange: DateRange.create(new Date('2026-01-10'), new Date('2026-01-20')),
    });
    const rawIssues: RawIssueData[] = [
      {
        key: 'PROJ-1',
        summary: 'planned done',
        status: 'Done',
        storyPointsRaw: 3,
        epicKey: 'EP-1',
        epicSummary: '[TeamA] Epic',
        assignee: null,
      },
      {
        key: 'PROJ-2',
        summary: 'added not done',
        status: 'In Progress',
        storyPointsRaw: 5,
        epicKey: 'EP-1',
        epicSummary: '[TeamA] Epic',
        assignee: null,
      },
    ];

    const sprintRepo: ISprintRepository = {
      getSprintsForBoard: async () => [],
      getSprintById: async () => sprint,
    };
    const issueRepo: IIssueRepository = {
      getIssuesForSprint: async () => rawIssues,
      getChangelogs: async () => [
        {
          issueKey: 'PROJ-1',
          fieldId: 'customfield_10200',
          fromString: null,
          toString: 'Sprint 42',
          created: '2026-01-09T00:00:00Z',
        },
        {
          issueKey: 'PROJ-2',
          fieldId: 'customfield_10200',
          fromString: null,
          toString: 'Sprint 42',
          created: '2026-01-11T00:00:00Z',
        },
      ],
    };
    const storage: IStoragePort = {
      get: async () => null,
      set: async () => undefined,
      delete: async () => undefined,
    };

    const result = await new ComputeSprintStats({
      sprintRepo,
      issueRepo,
      storage,
    }).execute({ boardId: 'b1', sprintId: 's1' });

    expect(result.totals.plannedSp).toBe(3);
    expect(result.totals.addedSp).toBe(5);
    expect(result.totals.completedSp).toBe(3);
    expect(result.totals.plannedCompletionRate).toBe(100);
    expect(result.totals.addedCompletionRate).toBe(0);
  });
});
