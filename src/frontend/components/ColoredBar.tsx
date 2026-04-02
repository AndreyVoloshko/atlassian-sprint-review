import { Box } from '@forge/react';

import { barFill, barTrack, COMPLETION_BAR_TOKENS } from '../styles';
import type { BarColor } from '../styles';

interface Props {
  value: number;
  color: BarColor;
}

export function ColoredBar({ value, color }: Props) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  return (
    <Box xcss={barTrack}>
      <Box xcss={barFill(pct, COMPLETION_BAR_TOKENS[color])} />
    </Box>
  );
}
