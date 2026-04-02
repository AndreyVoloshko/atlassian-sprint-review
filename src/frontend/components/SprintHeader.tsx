import { Heading, Inline, Lozenge, Stack, Strong, Text } from '@forge/react';

import type { SprintSummaryDto } from '../../shared';
import { formatDate } from '../helpers/format';

interface Props {
  sprint: SprintSummaryDto;
}

export function SprintHeader({ sprint }: Props) {
  return (
    <Stack space="space.100">
      <Inline space="space.100" alignBlock="center">
        <Heading size="large">{sprint.name}</Heading>
        {sprint.state === 'active' && <Lozenge appearance="inprogress">ongoing</Lozenge>}
        {sprint.state === 'closed' && <Lozenge appearance="success">closed</Lozenge>}
      </Inline>
      <Text>{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</Text>
      {sprint.goal && (
        <Text>
          <Strong>Goal:</Strong> {sprint.goal}
        </Text>
      )}
    </Stack>
  );
}
