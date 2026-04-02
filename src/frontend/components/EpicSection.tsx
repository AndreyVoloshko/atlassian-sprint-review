import type { ReactNode } from 'react';
import {
  DynamicTable,
  Heading,
  HorizontalStackBarChart,
  Link,
  Lozenge,
  Stack,
  Strong,
  Text,
} from '@forge/react';

import type { EpicBreakdownDto, TicketDto } from '../../shared';
import { CHART_PALETTE, epicChartData } from '../helpers/chart';
import { fmt } from '../helpers/format';
import { statusAppearance } from '../helpers/status';

interface Props {
  epics: EpicBreakdownDto[];
  tickets: TicketDto[];
}

const TICKET_TABLE_HEAD = {
  cells: [
    { key: 'key', content: 'Key' },
    { key: 'summary', content: 'Summary' },
    { key: 'status', content: 'Status' },
    { key: 'sp', content: 'SP' },
    { key: 'origin', content: 'Origin' },
  ],
};

function buildGroupedRows(epics: EpicBreakdownDto[], tickets: TicketDto[]) {
  const byEpic = new Map<string, TicketDto[]>();
  for (const t of tickets) {
    const ek = t.epicKey ?? t.key;
    const arr = byEpic.get(ek) ?? [];
    arr.push(t);
    byEpic.set(ek, arr);
  }

  const rows: Array<{
    key: string;
    cells: Array<{ key: string; content: ReactNode }>;
  }> = [];

  for (const epic of epics) {
    const epicTickets = byEpic.get(epic.epicKey) ?? [];
    const totalSp = epic.plannedSp + epic.addedSp;

    rows.push({
      key: `epic:${epic.epicKey}`,
      cells: [
        {
          key: 'key',
          content: (
            <Link href={`/browse/${epic.epicKey}`}>
              <Strong>{epic.epicKey}</Strong>
            </Link>
          ),
        },
        { key: 'summary', content: <Strong>{epic.epicLabel}</Strong> },
        { key: 'status', content: `${epicTickets.length} tickets` },
        { key: 'sp', content: <Strong>{fmt(totalSp)}</Strong> },
        { key: 'origin', content: '' },
      ],
    });

    for (const t of epicTickets) {
      rows.push({
        key: t.key,
        cells: [
          {
            key: 'key',
            content: <Link href={`/browse/${t.key}`}>{t.key}</Link>,
          },
          { key: 'summary', content: t.summary },
          {
            key: 'status',
            content: (
              <Lozenge appearance={statusAppearance(t.status)}>{t.status}</Lozenge>
            ),
          },
          { key: 'sp', content: fmt(t.storyPoints) },
          {
            key: 'origin',
            content: (
              <Lozenge appearance={t.origin === 'planned' ? 'new' : 'removed'}>
                {t.origin}
              </Lozenge>
            ),
          },
        ],
      });
    }
  }

  return rows;
}

export function EpicSection({ epics, tickets }: Props) {
  if (epics.length === 0) return null;

  return (
    <Stack space="space.300">
      <Stack space="space.150">
        <Heading size="medium">Story Points by Epic</Heading>
        <HorizontalStackBarChart
          data={epicChartData(epics)}
          xAccessor="label"
          yAccessor="sp"
          colorAccessor="type"
          colorPalette={CHART_PALETTE}
          height={Math.max(200, epics.length * 60)}
        />
      </Stack>

      <Stack space="space.150">
        <Heading size="medium">All Tickets</Heading>
        <DynamicTable
          head={TICKET_TABLE_HEAD}
          rows={buildGroupedRows(epics, tickets)}
          emptyView={<Text>No tickets</Text>}
        />
      </Stack>
    </Stack>
  );
}
