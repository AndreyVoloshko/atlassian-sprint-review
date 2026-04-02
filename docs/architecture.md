# Architecture

Sprint Review for Jira follows **clean architecture** — domain logic has zero dependencies on Forge, Jira APIs, or UI frameworks.

## Layer Dependency Rule

```mermaid
flowchart BT
    adapters["Adapters\n(Jira REST, Forge KVS)"] --> domain
    usecases["Use Cases\n(GetSprintList, ComputeSprintStats)"] --> domain["Domain\n(Sprint, Issue, StoryPoints)"]
    resolver["Resolver\n(composition root)"] --> usecases
    resolver --> adapters
    frontend["Frontend\n(UI Kit 2)"] -.->|invoke via bridge| resolver
```

Arrows point **inward** — outer layers depend on inner layers, never the reverse.

## Domain Layer

Pure TypeScript with no framework imports.

```mermaid
classDiagram
    class Sprint {
        +id: string
        +name: string
        +state: SprintState
        +goal: string
        +dateRange: DateRange
        +startDate: Date
        +endDate: Date
    }

    class Issue {
        +key: string
        +summary: string
        +status: string
        +storyPoints: StoryPoints
        +origin: IssueOrigin
        +epicKey: string | null
        +isCompleted() bool
        +isPlanned() bool
        +epicLabel: string
    }

    class StoryPoints {
        +value: number
        +create(raw) StoryPoints
    }

    class DateRange {
        +start: Date
        +end: Date
        +create(start, end) DateRange
    }

    class CompletionRate {
        +percentage: number
        +fromValues(completed, total) CompletionRate
    }

    Sprint --> DateRange
    Issue --> StoryPoints
```

### Ports (interfaces)

| Port | Purpose |
|---|---|
| `ISprintRepository` | Fetch sprints for a board or by ID |
| `IIssueRepository` | Fetch issues for a sprint + changelogs |
| `IStoragePort` | Get/set/delete cached values |

## Use Cases

### GetSprintList

Fetches all sprints for a board and returns them sorted newest-first.

### ComputeSprintStats

The core use case. Given a board and sprint:

```mermaid
flowchart TD
    A[Fetch sprint by ID] --> B[Fetch all issues in sprint]
    B --> C[Fetch changelogs for each issue]
    C --> D[Classify each issue: planned vs added]
    D --> E[Group by epic → compute breakdowns]
    E --> F[Sum totals + completion rates]
    F --> G[Cache result in KVS]
    G --> H[Return SprintStatsDto]

    D -- "Changelog has sprint-add\nbefore sprint start?" --> planned[Planned]
    D -- "Changelog has sprint-add\nafter sprint start?" --> added[Added]
```

**Planned vs Added classification**: An issue is "planned" if the earliest changelog entry adding it to the sprint predates the sprint start. Otherwise it's "added" (scope change).

## Adapters

| Adapter | Implements | Jira Endpoints |
|---|---|---|
| `JiraSprintRepository` | `ISprintRepository` | `GET /rest/agile/1.0/board/{id}/sprint`, `GET /rest/agile/1.0/sprint/{id}` |
| `JiraIssueRepository` | `IIssueRepository` | `GET /rest/agile/1.0/sprint/{id}/issue`, `GET /rest/api/3/issue/{key}?expand=changelog` |
| `ForgeStorageAdapter` | `IStoragePort` | Forge KVS (`@forge/kvs`) |

### Field Auto-Discovery

Story point and sprint field IDs vary across Jira instances. The adapter discovers them dynamically via `GET /rest/api/3/field` and caches the result for 1 hour in KVS.

### Release Data

```mermaid
flowchart LR
    board["GET /board/{id}"] -->|projectKey| versions["GET /project/{key}/versions"]
    versions --> counts["Per version:"]
    counts --> related["GET /version/{id}/relatedIssueCounts"]
    counts --> unresolved["GET /version/{id}/unresolvedIssueCount"]
    counts --> inprogress["GET /search?jql=fixVersion AND statusCategory"]
```

## Frontend

The frontend uses **Forge UI Kit 2** (`@forge/react`) — no custom HTML, no DOM. All styling uses `xcss` with Atlassian Design System tokens.

```mermaid
flowchart TD
    App --> SprintSelect[Sprint Selector]
    App --> Layout[Inline Layout]

    Layout --> Sidebar
    Layout --> Main[Main Content]

    Sidebar --> Epics[Epic Filter + StatusBar]
    Sidebar --> Releases[Release Cards + StatusBar]
    Sidebar --> Summary[Summary Placeholder]

    Main --> SprintHeader
    Main --> KpiCards
    Main --> CompletionRates[CompletionRates + ColoredBar]
    Main --> EpicSection[EpicSection: Chart + Table]
```

### Styling Rules

- All `xcss` calls live in `styles.ts` — components never import `xcss` directly
- Progress bar fills use a factory function (`barFill`) for dynamic widths
- Color tokens follow Atlassian's semantic palette (success, information, neutral)

## Caching Strategy

```mermaid
flowchart TD
    req[Resolver request] --> check{Cache exists\nand fresh?}
    check -->|Yes| hit[Return cached data]
    check -->|No| compute[Compute from Jira API]
    compute --> store[Store in KVS\nwith timestamp]
    store --> hit

    style hit fill:#4BCE97,color:#000
    style compute fill:#579DFF,color:#000
```

- **Sprint stats**: 5-minute TTL, keyed by `sprint:{boardId}:{sprintId}:stats`
- **Field IDs**: 1-hour TTL, keyed by `sys:fieldIds`
- `forceRefresh` flag bypasses cache when needed

## Testing

Tests cover each layer independently with in-memory mocks:

- **Domain tests** — value object validation, entity behavior
- **Use case tests** — origin classification, totals computation, caching
- **Adapter tests** — API response mapping, pagination, storage validation
