import type { EpicBreakdownDto, SprintStatsDto } from '../../shared';
import { pct } from './format';

export function recalcTotals(epics: EpicBreakdownDto[]): SprintStatsDto['totals'] {
  const s = epics.reduce(
    (a, e) => ({
      plannedSp: a.plannedSp + e.plannedSp,
      addedSp: a.addedSp + e.addedSp,
      completedSp: a.completedSp + e.completedSp,
      completedPlannedSp: a.completedPlannedSp + e.completedPlannedSp,
      completedAddedSp: a.completedAddedSp + e.completedAddedSp,
      plannedTickets: a.plannedTickets + e.plannedTickets,
      addedTickets: a.addedTickets + e.addedTickets,
      completedTickets: a.completedTickets + e.completedTickets,
      completedPlannedTickets: a.completedPlannedTickets + e.completedPlannedTickets,
      completedAddedTickets: a.completedAddedTickets + e.completedAddedTickets,
    }),
    {
      plannedSp: 0,
      addedSp: 0,
      completedSp: 0,
      completedPlannedSp: 0,
      completedAddedSp: 0,
      plannedTickets: 0,
      addedTickets: 0,
      completedTickets: 0,
      completedPlannedTickets: 0,
      completedAddedTickets: 0,
    },
  );

  return {
    ...s,
    plannedCompletionRate: pct(s.completedPlannedSp, s.plannedSp),
    addedCompletionRate: pct(s.completedAddedSp, s.addedSp),
    totalCompletionRate: pct(s.completedSp, s.plannedSp + s.addedSp),
  };
}
