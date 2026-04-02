import {
  Box,
  Inline,
  Label,
  SectionMessage,
  Select,
  Stack,
  Text,
} from '@forge/react';

import { useSprintData } from './hooks/useSprintData';
import { mainBox } from './styles';
import { SprintHeader } from './components/SprintHeader';
import { KpiCards } from './components/KpiCards';
import { CompletionRates } from './components/CompletionRates';
import { EpicSection } from './components/EpicSection';
import { Sidebar } from './components/Sidebar';

export function App() {
  const {
    boardId,
    sprints,
    releases,
    setSelectedSprintId,
    loading,
    error,
    filtered,
    allEpics,
    allTickets,
    selectedEpicKeys,
    toggleEpic,
    toggleAllEpics,
  } = useSprintData();

  if (!boardId) {
    return (
      <SectionMessage appearance="warning" title="No board context">
        <Text>Open this page from a Scrum project that has a board.</Text>
      </SectionMessage>
    );
  }

  return (
    <Stack space="space.300">
      <Stack space="space.050">
        <Label labelFor="sprint-select">Sprint</Label>
        <Select
          inputId="sprint-select"
          placeholder="Select a sprint"
          options={sprints.map((s) => ({
            label: `${s.name} (${s.state})`,
            value: s.id,
          }))}
          onChange={(opt) =>
            setSelectedSprintId(
              opt && typeof opt === 'object' && 'value' in opt
                ? (opt as { value: string }).value
                : null,
            )
          }
        />
      </Stack>

      {loading && <Text>Loading sprint data…</Text>}
      {error && (
        <SectionMessage appearance="error" title="Error">
          <Text>{error}</Text>
        </SectionMessage>
      )}

      {filtered && !loading && (
        <Inline space="space.400" alignBlock="start">
          <Sidebar
            allEpics={allEpics}
            allTickets={allTickets}
            selectedEpicKeys={selectedEpicKeys}
            toggleEpic={toggleEpic}
            toggleAllEpics={toggleAllEpics}
            releases={releases}
          />

          <Box xcss={mainBox}>
            <Stack space="space.300">
              <SprintHeader sprint={filtered.sprint} />
              <KpiCards totals={filtered.totals} />
              <CompletionRates totals={filtered.totals} />
              <EpicSection
                epics={filtered.epicBreakdowns}
                tickets={filtered.tickets}
              />
            </Stack>
          </Box>
        </Inline>
      )}
    </Stack>
  );
}
