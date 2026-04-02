# Sprint Review for Jira

An Atlassian Forge app that gives engineering and product managers a clear, data-driven view of sprint performance — right inside Jira.

Built with **TypeScript**, **Forge UI Kit 2**, and **clean architecture**.

## Features

- **KPI dashboard** — planned, added, and completed story points at a glance
- **Completion rates** — color-coded progress bars for planned, added, and total work
- **Epic breakdown** — stacked bar chart and grouped ticket table per epic
- **Sidebar** — epic filter with checkboxes, release progress, and sprint-scoped release list
- **Jira-native UI** — uses Atlassian Design System tokens and UI Kit 2 components

```mermaid
graph LR
    A[Select Sprint] --> B[KPI Cards]
    A --> C[Completion Rates]
    A --> D[Story Points by Epic]
    A --> E[All Tickets Table]
    A --> F[Sidebar: Epics + Releases]
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Atlassian Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/)
- A Jira Cloud site with a Scrum board

### Install and Deploy

```bash
# Install dependencies
npm install

# Register a new Forge app (first time only)
forge register

# Deploy to your Atlassian environment
forge deploy

# Install on your Jira site
forge install --site your-site.atlassian.net --product jira
```

### Development

```bash
# Type-check
npm run typecheck

# Run tests
npm test

# Live reload during development
forge tunnel
```

## Architecture

The app follows **clean architecture** with four layers. No layer depends on an outer layer.

```mermaid
flowchart TD
    subgraph Forge Runtime
        resolver["Resolver\n(src/index.ts)"]
    end

    subgraph Application
        uc["Use Cases\n(GetSprintList, ComputeSprintStats)"]
    end

    subgraph Domain
        entities["Entities & Value Objects\n(Sprint, Issue, StoryPoints, DateRange)"]
        ports["Ports\n(ISprintRepository, IIssueRepository, IStoragePort)"]
    end

    subgraph Infrastructure
        adapters["Adapters\n(JiraSprintRepository, JiraIssueRepository, ForgeStorageAdapter)"]
        jira["Jira REST API"]
        kvs["Forge KVS"]
    end

    subgraph Frontend
        ui["UI Kit 2 Components\n(@forge/react)"]
    end

    ui -->|invoke| resolver
    resolver --> uc
    uc --> entities
    uc --> ports
    adapters -.->|implements| ports
    adapters --> jira
    adapters --> kvs
    resolver --> adapters
```

See [`docs/architecture.md`](docs/architecture.md) for detailed data flow and design decisions.

## How It Works

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant R as Resolver
    participant UC as Use Case
    participant J as Jira API
    participant KVS as Forge KVS

    UI->>R: invoke("getSprintStats", { boardId, sprintId })
    R->>KVS: Check cache
    alt Cache hit
        KVS-->>R: Cached stats
    else Cache miss
        R->>UC: execute({ boardId, sprintId })
        UC->>J: GET /sprint/{id}
        UC->>J: GET /sprint/{id}/issue
        UC->>J: GET /issue/{key}?expand=changelog
        J-->>UC: Sprint + Issues + Changelogs
        UC->>UC: Classify planned vs added (changelog analysis)
        UC->>UC: Compute epic breakdowns & totals
        UC->>KVS: Store result
        UC-->>R: SprintStatsDto
    end
    R-->>UI: { success: true, data: SprintStatsDto }
```

## Roadmap

- [ ] AI-driven sprint summary for leadership reporting
- [ ] Sprint-over-sprint velocity trends
- [ ] Export to PDF / Confluence
- [ ] Atlassian Marketplace listing

## License

[MIT](LICENSE)
