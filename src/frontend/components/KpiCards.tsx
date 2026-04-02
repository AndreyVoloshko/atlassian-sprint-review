import { Box, Heading, Inline, Stack, Text } from '@forge/react';

import type { SprintStatsDto } from '../../shared';
import { fmt } from '../helpers/format';
import { addedCardBox, completedCardBox, plannedCardBox } from '../styles';

interface Props {
  totals: SprintStatsDto['totals'];
}

type CardDef = { label: string; value: string; style: typeof plannedCardBox };

export function KpiCards({ totals }: Props) {
  const cards: CardDef[] = [
    { label: 'PLANNED (SP)', value: fmt(totals.plannedSp), style: plannedCardBox },
    { label: 'ADDED (SP)', value: fmt(totals.addedSp), style: addedCardBox },
    { label: 'COMPLETED (SP)', value: fmt(totals.completedSp), style: completedCardBox },
    { label: 'FROM PLANNED (SP)', value: fmt(totals.completedPlannedSp), style: plannedCardBox },
    { label: 'FROM ADDED (SP)', value: fmt(totals.completedAddedSp), style: addedCardBox },
    { label: 'COMPLETION', value: `${totals.totalCompletionRate}%`, style: completedCardBox },
  ];

  return (
    <Inline space="space.200" shouldWrap>
      {cards.map((c) => (
        <Box key={c.label} xcss={c.style}>
          <Stack space="space.050">
            <Text>{c.label}</Text>
            <Heading size="large">{c.value}</Heading>
          </Stack>
        </Box>
      ))}
    </Inline>
  );
}
