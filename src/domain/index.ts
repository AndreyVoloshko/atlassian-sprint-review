export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SprintNotFoundError extends DomainError {
  constructor(sprintId: string) {
    super(`Sprint not found: ${sprintId}`, 'SPRINT_NOT_FOUND');
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, detail: string) {
    super(`${service} error: ${detail}`, 'EXTERNAL_SERVICE_ERROR');
  }
}

export class StoryPoints {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(raw: unknown): StoryPoints {
    if (raw === null || raw === undefined || raw === '') {
      return new StoryPoints(0);
    }
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (isNaN(num) || num < 0) {
      return new StoryPoints(0);
    }
    return new StoryPoints(num);
  }
}

export class CompletionRate {
  readonly percentage: number;

  private constructor(completed: number, total: number) {
    this.percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  static fromValues(completed: number, total: number): CompletionRate {
    return new CompletionRate(Math.max(0, completed), Math.max(0, total));
  }
}

export class DateRange {
  readonly start: Date;
  readonly end: Date;

  private constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }

  static create(start: Date, end: Date): DateRange {
    if (end < start) throw new Error('DateRange end must be after start');
    return new DateRange(start, end);
  }
}

export const SPRINT_STATE = {
  active: 'active',
  closed: 'closed',
  future: 'future',
} as const;
export type SprintState = (typeof SPRINT_STATE)[keyof typeof SPRINT_STATE];

export interface SprintProps {
  readonly id: string;
  readonly name: string;
  readonly state: SprintState;
  readonly boardId: string;
  readonly goal: string;
  readonly dateRange: DateRange;
}

export class Sprint {
  readonly id: string;
  readonly name: string;
  readonly state: SprintState;
  readonly boardId: string;
  readonly goal: string;
  readonly dateRange: DateRange;

  constructor(props: SprintProps) {
    this.id = props.id;
    this.name = props.name;
    this.state = props.state;
    this.boardId = props.boardId;
    this.goal = props.goal;
    this.dateRange = props.dateRange;
  }

  get startDate(): Date {
    return this.dateRange.start;
  }

  get endDate(): Date {
    return this.dateRange.end;
  }
}

export const ISSUE_ORIGIN = {
  planned: 'planned',
  added: 'added',
} as const;
export type IssueOrigin = (typeof ISSUE_ORIGIN)[keyof typeof ISSUE_ORIGIN];

export const COMPLETED_STATUSES = new Set([
  'Done',
  'Closed',
  'Waiting For Production',
]);

export interface IssueProps {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly storyPoints: StoryPoints;
  readonly epicKey: string | null;
  readonly epicSummary: string | null;
  readonly assignee: string | null;
  readonly origin: IssueOrigin;
}

export class Issue {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly storyPoints: StoryPoints;
  readonly epicKey: string | null;
  readonly epicSummary: string | null;
  readonly assignee: string | null;
  readonly origin: IssueOrigin;

  constructor(props: IssueProps) {
    this.key = props.key;
    this.summary = props.summary;
    this.status = props.status;
    this.storyPoints = props.storyPoints;
    this.epicKey = props.epicKey;
    this.epicSummary = props.epicSummary;
    this.assignee = props.assignee;
    this.origin = props.origin;
  }

  isCompleted(): boolean {
    return COMPLETED_STATUSES.has(this.status);
  }

  isPlanned(): boolean {
    return this.origin === ISSUE_ORIGIN.planned;
  }

  get epicLabel(): string {
    if (this.epicKey && this.epicSummary) {
      return `${this.epicKey}: ${this.epicSummary}`;
    }
    return this.epicKey ?? this.key;
  }
}

export interface RawIssueData {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly storyPointsRaw: unknown;
  readonly epicKey: string | null;
  readonly epicSummary: string | null;
  readonly assignee: string | null;
}

export interface ChangelogEntry {
  readonly issueKey: string;
  readonly fieldId: string;
  readonly fromString: string | null;
  readonly toString: string | null;
  readonly created: string;
}

export interface ISprintRepository {
  getSprintsForBoard(boardId: string): Promise<Sprint[]>;
  getSprintById(sprintId: string): Promise<Sprint | null>;
}

export interface IIssueRepository {
  getIssuesForSprint(sprintId: string): Promise<RawIssueData[]>;
  getChangelogs(issueKeys: string[]): Promise<ChangelogEntry[]>;
}

export interface CachedValue<T> {
  readonly data: T;
  readonly computedAt: string;
}

export interface IStoragePort {
  get<T>(key: string): Promise<CachedValue<T> | null>;
  set<T>(key: string, value: CachedValue<T>): Promise<void>;
  delete(key: string): Promise<void>;
}
