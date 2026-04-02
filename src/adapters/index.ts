import { DateRange, ExternalServiceError, Sprint } from '../domain';
import type {
  CachedValue,
  ChangelogEntry,
  IIssueRepository,
  IStoragePort,
  ISprintRepository,
  RawIssueData,
} from '../domain';
import type { ReleaseDto } from '../shared';

export interface JiraApiClient {
  fetch(route: string): Promise<Response>;
}

// ---------------------------------------------------------------------------
// Field auto-discovery
// ---------------------------------------------------------------------------

export interface FieldIds {
  storyPointsField: string;
  sprintField: string;
}

interface JiraFieldDef {
  id: string;
  name: string;
  schema?: { custom?: string };
}

const SP_NAMES = new Set(['story points', 'story point estimate']);

export async function discoverFieldIds(api: JiraApiClient): Promise<FieldIds> {
  const response = await api.fetch('/rest/api/3/field');
  if (!response.ok) {
    return { storyPointsField: 'story_points', sprintField: 'customfield_10020' };
  }

  const fields = (await response.json()) as JiraFieldDef[];

  let storyPointsField = 'story_points';
  let sprintField = 'customfield_10020';

  for (const f of fields) {
    const name = f.name.toLowerCase();
    if (SP_NAMES.has(name)) storyPointsField = f.id;
    if (f.schema?.custom === 'com.pyxis.greenhopper.jira:gh-sprint') sprintField = f.id;
  }

  return { storyPointsField, sprintField };
}

interface JiraSprintResponse {
  values: Array<{
    id: number;
    name: string;
    state: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
  }>;
  isLast: boolean;
}

interface JiraSingleSprintResponse {
  id: number;
  name: string;
  state: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export class JiraSprintRepository implements ISprintRepository {
  constructor(private readonly api: JiraApiClient) {}

  async getSprintsForBoard(boardId: string): Promise<Sprint[]> {
    const sprints: Sprint[] = [];
    let startAt = 0;
    const maxResults = 50;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await this.api.fetch(
        `/rest/agile/1.0/board/${boardId}/sprint?startAt=${startAt}&maxResults=${maxResults}`,
      );
      if (!response.ok) {
        throw new ExternalServiceError(
          'Jira',
          `Failed to fetch sprints: ${response.status}`,
        );
      }
      const data = (await response.json()) as JiraSprintResponse;
      for (const raw of data.values) {
        const sprint = this.mapToSprint(raw, boardId);
        if (sprint) sprints.push(sprint);
      }
      if (data.isLast || data.values.length < maxResults) break;
      startAt += maxResults;
    }
    return sprints;
  }

  async getSprintById(sprintId: string): Promise<Sprint | null> {
    const response = await this.api.fetch(`/rest/agile/1.0/sprint/${sprintId}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ExternalServiceError(
        'Jira',
        `Failed to fetch sprint: ${response.status}`,
      );
    }
    const raw = (await response.json()) as JiraSingleSprintResponse;
    return this.mapToSprint(raw, '') ?? null;
  }

  private mapToSprint(raw: JiraSingleSprintResponse, boardId: string): Sprint | null {
    if (!raw.startDate || !raw.endDate) return null;
    return new Sprint({
      id: String(raw.id),
      name: raw.name,
      state: raw.state as 'active' | 'closed' | 'future',
      boardId,
      goal: raw.goal ?? '',
      dateRange: DateRange.create(new Date(raw.startDate), new Date(raw.endDate)),
    });
  }
}

interface JiraIssueSearchResponse {
  issues: Array<{
    key: string;
    fields: {
      summary: string;
      status: { name: string };
      parent?: { key: string; fields: { summary: string } };
      assignee?: { displayName: string } | null;
    };
  }>;
  startAt: number;
  maxResults: number;
  total: number;
}

interface JiraIssueDetailResponse {
  changelog: {
    histories: Array<{
      created: string;
      items: Array<{
        fieldId: string;
        fromString: string | null;
        toString: string | null;
      }>;
    }>;
  };
}

const CHANGELOG_BATCH_SIZE = 10;

export class JiraIssueRepository implements IIssueRepository {
  constructor(
    private readonly api: JiraApiClient,
    private readonly storyPointFieldId = 'story_points',
    private readonly sprintFieldId = 'customfield_10020',
  ) {}

  async getIssuesForSprint(sprintId: string): Promise<RawIssueData[]> {
    const issues: RawIssueData[] = [];
    let startAt = 0;
    const maxResults = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await this.api.fetch(
        `/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${maxResults}&fields=summary,status,parent,assignee,${this.storyPointFieldId}`,
      );
      if (!response.ok) {
        throw new ExternalServiceError(
          'Jira',
          `Failed to fetch sprint issues: ${response.status}`,
        );
      }
      const data = (await response.json()) as JiraIssueSearchResponse;
      for (const issue of data.issues) {
        issues.push({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          storyPointsRaw:
            (issue.fields as Record<string, unknown>)[this.storyPointFieldId] ?? null,
          epicKey: issue.fields.parent?.key ?? null,
          epicSummary: issue.fields.parent?.fields.summary ?? null,
          assignee: issue.fields.assignee?.displayName ?? null,
        });
      }
      if (startAt + data.maxResults >= data.total) break;
      startAt += maxResults;
    }
    return issues;
  }

  async getChangelogs(issueKeys: string[]): Promise<ChangelogEntry[]> {
    const entries: ChangelogEntry[] = [];
    for (let i = 0; i < issueKeys.length; i += CHANGELOG_BATCH_SIZE) {
      const batch = issueKeys.slice(i, i + CHANGELOG_BATCH_SIZE);
      const results = await Promise.all(batch.map((k) => this.fetchIssueChangelog(k)));
      entries.push(...results.flat());
    }
    return entries;
  }

  private async fetchIssueChangelog(issueKey: string): Promise<ChangelogEntry[]> {
    const response = await this.api.fetch(
      `/rest/api/3/issue/${issueKey}?expand=changelog&fields=`,
    );
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new ExternalServiceError(
        'Jira',
        `Failed to fetch changelog for ${issueKey}: ${response.status}`,
      );
    }
    const data = (await response.json()) as JiraIssueDetailResponse;
    const entries: ChangelogEntry[] = [];
    for (const history of data.changelog.histories) {
      for (const item of history.items) {
        if (item.fieldId === this.sprintFieldId) {
          entries.push({
            issueKey,
            fieldId: item.fieldId,
            fromString: item.fromString,
            toString: item.toString,
            created: history.created,
          });
        }
      }
    }
    return entries;
  }
}

// ---------------------------------------------------------------------------
// Board → project key lookup
// ---------------------------------------------------------------------------

interface JiraBoardResponse {
  id: number;
  location?: { projectKey?: string };
}

export async function getProjectKeyForBoard(
  api: JiraApiClient,
  boardId: string,
): Promise<string> {
  const response = await api.fetch(`/rest/agile/1.0/board/${boardId}`);
  if (!response.ok) {
    throw new ExternalServiceError('Jira', `Failed to fetch board ${boardId}: ${response.status}`);
  }
  const data = (await response.json()) as JiraBoardResponse;
  const key = data.location?.projectKey;
  if (!key) {
    throw new ExternalServiceError('Jira', `Board ${boardId} has no associated project`);
  }
  return key;
}

// ---------------------------------------------------------------------------
// Project versions (releases)
// ---------------------------------------------------------------------------

interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
  archived: boolean;
  releaseDate?: string;
  userReleaseDate?: string;
  overdue?: boolean;
  projectId: number;
}

async function fetchVersionIssueCounts(
  api: JiraApiClient,
  versionId: string,
): Promise<{ total: number; done: number; inProgress: number }> {
  const [relatedRes, unresolvedRes, inProgressRes] = await Promise.all([
    api.fetch(`/rest/api/3/version/${versionId}/relatedIssueCounts`),
    api.fetch(`/rest/api/3/version/${versionId}/unresolvedIssueCount`),
    api.fetch(
      `/rest/api/3/search?jql=${encodeURIComponent(`fixVersion = ${versionId} AND statusCategory = "In Progress"`)}&maxResults=0`,
    ),
  ]);

  let total = 0;
  let unresolved = 0;
  let inProgress = 0;

  if (relatedRes.ok) {
    const data = (await relatedRes.json()) as { issuesFixedCount?: number };
    total = data.issuesFixedCount ?? 0;
  }
  if (unresolvedRes.ok) {
    const data = (await unresolvedRes.json()) as { issuesUnresolvedCount?: number };
    unresolved = data.issuesUnresolvedCount ?? 0;
  }
  if (inProgressRes.ok) {
    const data = (await inProgressRes.json()) as { total?: number };
    inProgress = data.total ?? 0;
  }

  return {
    total,
    done: Math.max(0, total - unresolved),
    inProgress: Math.min(inProgress, unresolved),
  };
}

export async function fetchProjectReleases(
  api: JiraApiClient,
  projectKey: string,
): Promise<ReleaseDto[]> {
  const response = await api.fetch(`/rest/api/3/project/${projectKey}/versions`);
  if (!response.ok) {
    throw new ExternalServiceError(
      'Jira',
      `Failed to fetch versions for project ${projectKey}: ${response.status}`,
    );
  }
  const versions = (await response.json()) as JiraVersion[];

  const counts = await Promise.all(
    versions.map((v) => fetchVersionIssueCounts(api, v.id)),
  );

  return versions.map((v, i) => ({
    id: v.id,
    name: v.name,
    status: v.archived ? 'archived' as const : v.released ? 'released' as const : 'unreleased' as const,
    releaseDate: v.releaseDate ?? null,
    overdue: v.overdue ?? false,
    projectKey,
    issuesTotal: counts[i].total,
    issuesDone: counts[i].done,
    issuesInProgress: counts[i].inProgress,
  }));
}

interface ForgeStorageApi {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export class ForgeStorageAdapter implements IStoragePort {
  constructor(private readonly storage: ForgeStorageApi) {}

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    const raw = await this.storage.get(key);
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    if (!('data' in record) || !('computedAt' in record)) return null;
    return raw as CachedValue<T>;
  }

  async set<T>(key: string, value: CachedValue<T>): Promise<void> {
    await this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }
}
