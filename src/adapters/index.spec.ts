import {
  ForgeStorageAdapter,
  JiraIssueRepository,
  JiraSprintRepository,
} from './index';

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('adapters', () => {
  it('JiraSprintRepository should paginate and map sprint values', async () => {
    const responses = [
      makeJsonResponse({
        values: Array.from({ length: 50 }, (_, idx) => ({
          id: idx + 1,
          name: `S${idx + 1}`,
          state: 'closed',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-10T00:00:00.000Z',
          goal: 'g1',
        })),
        isLast: false,
      }),
      makeJsonResponse({
        values: [
          {
            id: 2,
            name: 'S2',
            state: 'active',
            startDate: '2026-01-11T00:00:00.000Z',
            endDate: '2026-01-20T00:00:00.000Z',
            goal: 'g2',
          },
          {
            id: 3,
            name: 'NoDates',
            state: 'future',
          },
        ],
        isLast: true,
      }),
    ];
    const api = {
      fetch: jest.fn(async () => responses.shift() as Response),
    };

    const repo = new JiraSprintRepository(api);
    const sprints = await repo.getSprintsForBoard('1');

    expect(api.fetch).toHaveBeenCalledTimes(2);
    expect(sprints).toHaveLength(51);
    expect(sprints.some((s) => s.id === '2')).toBe(true);
  });

  it('JiraIssueRepository should map issue fields from sprint endpoint', async () => {
    const api = {
      fetch: jest.fn(async () =>
        makeJsonResponse({
          issues: [
            {
              key: 'PROJ-1',
              fields: {
                summary: 'Issue',
                status: { name: 'Done' },
                parent: { key: 'EP-1', fields: { summary: 'Epic' } },
                assignee: { displayName: 'Alex' },
                story_points: 8,
              },
            },
          ],
          startAt: 0,
          maxResults: 100,
          total: 1,
        }),
      ),
    };

    const repo = new JiraIssueRepository(api);
    const issues = await repo.getIssuesForSprint('42');

    expect(issues).toEqual([
      {
        key: 'PROJ-1',
        summary: 'Issue',
        status: 'Done',
        storyPointsRaw: 8,
        epicKey: 'EP-1',
        epicSummary: 'Epic',
        assignee: 'Alex',
      },
    ]);
  });

  it('ForgeStorageAdapter should validate cached shape', async () => {
    const storageApi = {
      get: jest.fn(async (): Promise<unknown> => ({ foo: 1 })),
      set: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
    };
    const adapter = new ForgeStorageAdapter(storageApi);

    const value = await adapter.get<{ a: number }>('k1');
    expect(value).toBeNull();

    storageApi.get.mockResolvedValueOnce({
      data: { a: 1 },
      computedAt: new Date().toISOString(),
    });
    const valid = await adapter.get<{ a: number }>('k2');
    expect(valid?.data.a).toBe(1);
  });
});
