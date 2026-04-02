import { Box } from '@forge/react';

import { barFill, barTrack, STATUS_DONE_TOKEN, STATUS_IN_PROGRESS_TOKEN } from '../styles';

interface Props {
  completed: number;
  inProgress: number;
  total: number;
}

/**
 * Three-segment stacked bar: green (done) | blue (in progress) | gray (todo).
 * Uses nested boxes: track (gray) > combined fill (blue) > completed fill (green).
 */
export function StatusBar({ completed, inProgress, total }: Props) {
  if (total === 0) return <Box xcss={barTrack} />;

  const combinedPct = Math.min(100, Math.round(((completed + inProgress) / total) * 100));
  const completedInnerPct =
    completed + inProgress > 0
      ? Math.round((completed / (completed + inProgress)) * 100)
      : 0;

  return (
    <Box xcss={barTrack}>
      <Box xcss={barFill(combinedPct, STATUS_IN_PROGRESS_TOKEN, true)}>
        <Box xcss={barFill(completedInnerPct, STATUS_DONE_TOKEN)} />
      </Box>
    </Box>
  );
}
