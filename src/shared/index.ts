export const RESOLVER_KEYS = {
  getSprintList: 'getSprintList',
  getSprintStats: 'getSprintStats',
  getReleases: 'getReleases',
} as const;

export interface GetSprintListPayload {
  readonly boardId: string;
}

export interface GetSprintStatsPayload {
  readonly boardId: string;
  readonly sprintId: string;
  readonly forceRefresh?: boolean;
}

export interface SprintSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly state: 'active' | 'closed' | 'future';
  readonly goal: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface EpicBreakdownDto {
  readonly epicKey: string;
  readonly epicLabel: string;
  readonly plannedSp: number;
  readonly addedSp: number;
  readonly completedSp: number;
  readonly completedPlannedSp: number;
  readonly completedAddedSp: number;
  readonly plannedTickets: number;
  readonly addedTickets: number;
  readonly completedTickets: number;
  readonly completedPlannedTickets: number;
  readonly completedAddedTickets: number;
}

export interface TicketDto {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly storyPoints: number;
  readonly origin: 'planned' | 'added';
  readonly isCompleted: boolean;
  readonly epicKey: string | null;
  readonly epicLabel: string;
}

export interface SprintStatsDto {
  readonly sprint: SprintSummaryDto;
  readonly totals: {
    readonly plannedSp: number;
    readonly addedSp: number;
    readonly completedSp: number;
    readonly completedPlannedSp: number;
    readonly completedAddedSp: number;
    readonly plannedTickets: number;
    readonly addedTickets: number;
    readonly completedTickets: number;
    readonly completedPlannedTickets: number;
    readonly completedAddedTickets: number;
    readonly plannedCompletionRate: number;
    readonly addedCompletionRate: number;
    readonly totalCompletionRate: number;
  };
  readonly epicBreakdowns: EpicBreakdownDto[];
  readonly tickets: TicketDto[];
}

export interface GetReleasesPayload {
  readonly boardId: string;
}

export interface ReleaseDto {
  readonly id: string;
  readonly name: string;
  readonly status: 'released' | 'unreleased' | 'archived';
  readonly releaseDate: string | null;
  readonly overdue: boolean;
  readonly projectKey: string;
  readonly issuesTotal: number;
  readonly issuesDone: number;
  readonly issuesInProgress: number;
}

export interface ResolverResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
