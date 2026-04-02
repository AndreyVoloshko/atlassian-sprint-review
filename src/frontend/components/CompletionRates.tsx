import { Heading, Inline, Stack, Strong, Text } from '@forge/react';

import type { SprintStatsDto } from '../../shared';
import { fmt } from '../helpers/format';
import type { BarColor } from '../styles';
import { ColoredBar } from './ColoredBar';

interface Props {
  totals: SprintStatsDto['totals'];
}

export function CompletionRates({ totals }: Props) {
  return (
    <Stack space="space.150">
      <Heading size="medium">Completion Rates</Heading>

      <RateRow
        label="Planned work"
        completed={totals.completedPlannedSp}
        total={totals.plannedSp}
        rate={totals.plannedCompletionRate}
        color="purple"
      />

      <RateRow
        label="Added work"
        completed={totals.completedAddedSp}
        total={totals.addedSp}
        rate={totals.addedCompletionRate}
        color="yellow"
      />

      <RateRow
        label="Total completed"
        completed={totals.completedSp}
        total={totals.plannedSp + totals.addedSp}
        rate={totals.totalCompletionRate}
        color="green"
      />
    </Stack>
  );
}

interface RateRowProps {
  label: string;
  completed: number;
  total: number;
  rate: number;
  color: BarColor;
}

function RateRow({ label, completed, total, rate, color }: RateRowProps) {
  return (
    <Stack space="space.050">
      <Inline spread="space-between">
        <Text>
          <Strong>{label}</Strong>
        </Text>
        <Text>
          {fmt(completed)} / {fmt(total)} sp ({rate}%)
        </Text>
      </Inline>
      <ColoredBar value={rate / 100} color={color} />
    </Stack>
  );
}
