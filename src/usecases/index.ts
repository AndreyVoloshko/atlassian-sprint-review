import {
  CompletionRate,
  ISSUE_ORIGIN,
  Issue,
  SprintNotFoundError,
  StoryPoints,
} from '../domain';
import type {
  CachedValue,
  ChangelogEntry,
  IIssueRepository,
  ISprintRepository,
  IStoragePort,
  IssueOrigin,
} from '../domain';
import type {
  EpicBreakdownDto,
  SprintStatsDto,
  SprintSummaryDto,
  TicketDto,
} from '../shared';

interface GetSprintListDeps {
  readonly sprintRepo: ISprintRepository;
}

interface GetSprintListInput {
  readonly boardId: string;
}

export class GetSprintList {
  constructor(private readonly deps: GetSprintListDeps) {}

  async execute(input: GetSprintListInput): Promise<SprintSummaryDto[]> {
    const sprints = await this.deps.sprintRepo.getSprintsForBoard(input.boardId);
    return sprints
      .map((s) => ({
        id: s.id,
        name: s.name,
        state: s.state,
        goal: s.goal,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
      }))
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
  }
}

export function classifyIssueOrigin(
  issueKey: string,
  changelogs: ChangelogEntry[],
  sprintName: string,
  sprintStartDate: Date,
): IssueOrigin {
  const sprintChanges = changelogs.filter(
    (entry) =>
      entry.issueKey === issueKey &&
      entry.toString !== null &&
      entry.toString.includes(sprintName),
  );

  if (sprintChanges.length > 0) {
    const earliest = sprintChanges.reduce((min, entry) => {
      const d = new Date(entry.created);
      return d < min ? d : min;
    }, new Date(sprintChanges[0]!.created));
    return earliest < sprintStartDate ? ISSUE_ORIGIN.planned : ISSUE_ORIGIN.added;
  }

  return ISSUE_ORIGIN.planned;
}

interface ComputeSprintStatsDeps {
  readonly sprintRepo: ISprintRepository;
  readonly issueRepo: IIssueRepository;
  readonly storage: IStoragePort;
}

interface ComputeSprintStatsInput {
  readonly boardId: string;
  readonly sprintId: string;
  readonly forceRefresh?: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type MutableEpicBreakdown = Mutable<EpicBreakdownDto>;

export class ComputeSprintStats {
  constructor(private readonly deps: ComputeSprintStatsDeps) {}

  async execute(input: ComputeSprintStatsInput): Promise<SprintStatsDto> {
    const cacheKey = `sprint:${input.boardId}:${input.sprintId}:stats`;
    if (!input.forceRefresh) {
      const cached = await this.deps.storage.get<SprintStatsDto>(cacheKey);
      if (cached && !this.isStale(cached)) return cached.data;
    }

    const sprint = await this.deps.sprintRepo.getSprintById(input.sprintId);
    if (!sprint) throw new SprintNotFoundError(input.sprintId);

    const rawIssues = await this.deps.issueRepo.getIssuesForSprint(input.sprintId);
    const changelogs = await this.deps.issueRepo.getChangelogs(
      rawIssues.map((i) => i.key),
    );

    const issues = rawIssues.map(
      (raw) =>
        new Issue({
          key: raw.key,
          summary: raw.summary,
          status: raw.status,
          storyPoints: StoryPoints.create(raw.storyPointsRaw),
          epicKey: raw.epicKey,
          epicSummary: raw.epicSummary,
          assignee: raw.assignee,
          origin: classifyIssueOrigin(
            raw.key,
            changelogs,
            sprint.name,
            sprint.startDate,
          ),
        }),
    );

    const epicBreakdowns = this.computeEpicBreakdowns(issues);
    const totals = this.computeTotals(epicBreakdowns);
    const tickets = this.mapTickets(issues);

    const result: SprintStatsDto = {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        goal: sprint.goal,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
      },
      totals,
      epicBreakdowns,
      tickets,
    };

    await this.deps.storage.set(cacheKey, {
      data: result,
      computedAt: new Date().toISOString(),
    });

    return result;
  }

  private isStale(cached: CachedValue<unknown>): boolean {
    return Date.now() - new Date(cached.computedAt).getTime() > CACHE_TTL_MS;
  }

  private computeEpicBreakdowns(issues: Issue[]): EpicBreakdownDto[] {
    const map = new Map<string, MutableEpicBreakdown>();
    for (const issue of issues) {
      const epicKey = issue.epicKey ?? issue.key;
      const current = map.get(epicKey) ?? {
        epicKey,
        epicLabel: issue.epicLabel,
        epicColor: null as string | null,
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
      };
      const sp = issue.storyPoints.value;
      if (issue.isPlanned()) {
        current.plannedSp += sp;
        current.plannedTickets += 1;
      } else {
        current.addedSp += sp;
        current.addedTickets += 1;
      }
      if (issue.isCompleted()) {
        current.completedSp += sp;
        current.completedTickets += 1;
        if (issue.isPlanned()) {
          current.completedPlannedSp += sp;
          current.completedPlannedTickets += 1;
        } else {
          current.completedAddedSp += sp;
          current.completedAddedTickets += 1;
        }
      }
      map.set(epicKey, current);
    }
    return Array.from(map.values()).map((entry) => ({ ...entry }));
  }

  private computeTotals(epics: EpicBreakdownDto[]): SprintStatsDto['totals'] {
    const sum = epics.reduce(
      (acc, e) => ({
        plannedSp: acc.plannedSp + e.plannedSp,
        addedSp: acc.addedSp + e.addedSp,
        completedSp: acc.completedSp + e.completedSp,
        completedPlannedSp: acc.completedPlannedSp + e.completedPlannedSp,
        completedAddedSp: acc.completedAddedSp + e.completedAddedSp,
        plannedTickets: acc.plannedTickets + e.plannedTickets,
        addedTickets: acc.addedTickets + e.addedTickets,
        completedTickets: acc.completedTickets + e.completedTickets,
        completedPlannedTickets:
          acc.completedPlannedTickets + e.completedPlannedTickets,
        completedAddedTickets: acc.completedAddedTickets + e.completedAddedTickets,
      }),
      {
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
      },
    );

    return {
      ...sum,
      plannedCompletionRate: CompletionRate.fromValues(
        sum.completedPlannedSp,
        sum.plannedSp,
      ).percentage,
      addedCompletionRate: CompletionRate.fromValues(
        sum.completedAddedSp,
        sum.addedSp,
      ).percentage,
      totalCompletionRate: CompletionRate.fromValues(
        sum.completedSp,
        sum.plannedSp + sum.addedSp,
      ).percentage,
    };
  }

  private mapTickets(issues: Issue[]): TicketDto[] {
    return issues.map((i) => ({
      key: i.key,
      summary: i.summary,
      status: i.status,
      storyPoints: i.storyPoints.value,
      origin: i.origin,
      isCompleted: i.isCompleted(),
      epicKey: i.epicKey,
      epicLabel: i.epicLabel,
    }));
  }
}
