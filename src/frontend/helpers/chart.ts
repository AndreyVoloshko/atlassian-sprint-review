import type { EpicBreakdownDto } from '../../shared';

export const CHART_PALETTE = [
  { key: 'Planned', value: '#9F8FEF' },
  { key: 'Added', value: '#F87168' },
];

export function epicChartData(epics: EpicBreakdownDto[]) {
  return epics.flatMap((e) => [
    { label: e.epicLabel, sp: e.plannedSp, type: 'Planned' },
    { label: e.epicLabel, sp: e.addedSp, type: 'Added' },
  ]);
}
