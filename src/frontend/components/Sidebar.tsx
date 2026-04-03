import { useMemo } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Heading,
  Inline,
  Link,
  Lozenge,
  Stack,
  Strong,
  Text,
} from '@forge/react';

import type { EpicBreakdownDto, ReleaseDto, TicketDto } from '../../shared';
import { fmt, formatDate } from '../helpers/format';
import { epicColorDot, sidebarBox, sidebarCardBox, sidebarSectionBox } from '../styles';
import { StatusBar } from './StatusBar';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  allEpics: EpicBreakdownDto[];
  allTickets: TicketDto[];
  selectedEpicKeys: Set<string>;
  toggleEpic: (epicKey: string) => void;
  toggleAllEpics: () => void;
  releases: ReleaseDto[];
}

// ---------------------------------------------------------------------------
// Epic status aggregation
// ---------------------------------------------------------------------------

interface EpicStatusSp {
  completed: number;
  inProgress: number;
}

function buildEpicStatusMap(tickets: TicketDto[]): Map<string, EpicStatusSp> {
  const map = new Map<string, EpicStatusSp>();
  for (const t of tickets) {
    const ek = t.epicKey ?? t.key;
    const entry = map.get(ek) ?? { completed: 0, inProgress: 0 };
    if (t.isCompleted) {
      entry.completed += t.storyPoints;
    } else if (t.status.toLowerCase() !== 'to do') {
      entry.inProgress += t.storyPoints;
    }
    map.set(ek, entry);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Release helpers
// ---------------------------------------------------------------------------

function releaseAppearance(r: ReleaseDto): 'default' | 'success' | 'removed' | 'moved' {
  if (r.status === 'released') return 'success';
  if (r.status === 'archived') return 'default';
  if (r.overdue) return 'removed';
  return 'moved';
}

function releaseStatusLabel(r: ReleaseDto): string {
  if (r.status === 'released') return 'Released';
  if (r.status === 'archived') return 'Archived';
  if (r.overdue) return 'Overdue';
  return 'Unreleased';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar({
  allEpics,
  allTickets,
  selectedEpicKeys,
  toggleEpic,
  toggleAllEpics,
  releases,
}: Props) {
  const allSelected = allEpics.length > 0 && selectedEpicKeys.size === allEpics.length;
  const epicStatusMap = useMemo(() => buildEpicStatusMap(allTickets), [allTickets]);

  return (
    <Box xcss={sidebarBox}>
      <Stack space="space.200">
        <Box xcss={sidebarSectionBox}>
          <Stack space="space.100">
            <Inline spread="space-between" alignBlock="center">
              <Heading size="small">Epics</Heading>
              <Checkbox
                key={`all-${allSelected}`}
                label="All"
                value="__all__"
                defaultChecked={allSelected}
                onChange={() => toggleAllEpics()}
              />
            </Inline>

            {allEpics.map((e) => {
              const totalSp = e.plannedSp + e.addedSp;
              const totalTickets = e.plannedTickets + e.addedTickets;
              const status = epicStatusMap.get(e.epicKey) ?? { completed: 0, inProgress: 0 };

              return (
                <Box key={e.epicKey} xcss={sidebarCardBox}>
                  <Stack space="space.050">
                    <Inline alignBlock="center" space="space.050">
                      <Box xcss={epicColorDot(e.epicColor)} />
                      <Checkbox
                        key={`${e.epicKey}-${selectedEpicKeys.has(e.epicKey)}`}
                        label={e.epicLabel}
                        value={e.epicKey}
                        defaultChecked={selectedEpicKeys.has(e.epicKey)}
                        onChange={() => toggleEpic(e.epicKey)}
                      />
                    </Inline>
                    <Inline space="space.050">
                      <Badge>{`${totalTickets} tickets`}</Badge>
                      <Badge appearance="primary">{`${fmt(totalSp)} sp`}</Badge>
                    </Inline>
                    <StatusBar
                      completed={status.completed}
                      inProgress={status.inProgress}
                      total={totalSp}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {releases.length > 0 && (
          <Box xcss={sidebarSectionBox}>
            <Stack space="space.100">
              <Heading size="small">Releases</Heading>
              {releases.map((r) => (
                <Box key={r.id} xcss={sidebarCardBox}>
                  <Stack space="space.050">
                    <Link href={`/projects/${r.projectKey}/versions/${r.id}`}>
                      <Strong>{r.name}</Strong>
                    </Link>
                    <StatusBar completed={r.issuesDone} inProgress={r.issuesInProgress} total={r.issuesTotal} />
                    <Inline space="space.100" alignBlock="center">
                      <Lozenge appearance={releaseAppearance(r)}>
                        {releaseStatusLabel(r)}
                      </Lozenge>
                      <Text>{formatDate(r.releaseDate)}</Text>
                    </Inline>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Box xcss={sidebarSectionBox}>
          <Stack space="space.100">
            <Heading size="small">Summary</Heading>
            <Text>AI-driven summary will be available in a future release.</Text>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
