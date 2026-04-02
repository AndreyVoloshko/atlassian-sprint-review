import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@forge/bridge';
import { useProductContext } from '@forge/react';

import { RESOLVER_KEYS } from '../../shared';
import type {
  EpicBreakdownDto,
  ReleaseDto,
  ResolverResponse,
  SprintStatsDto,
  SprintSummaryDto,
  TicketDto,
} from '../../shared';
import { recalcTotals } from '../helpers/filter';

export interface FilteredStats {
  sprint: SprintStatsDto['sprint'];
  totals: SprintStatsDto['totals'];
  epicBreakdowns: EpicBreakdownDto[];
  tickets: TicketDto[];
}

export function useSprintData() {
  const context = useProductContext();
  const boardId = context?.extension?.board?.id
    ? String(context.extension.board.id)
    : null;

  const [sprints, setSprints] = useState<SprintSummaryDto[]>([]);
  const [releases, setReleases] = useState<ReleaseDto[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [stats, setStats] = useState<SprintStatsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpicKeys, setSelectedEpicKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!boardId) return;
    invoke<ResolverResponse<SprintSummaryDto[]>>(RESOLVER_KEYS.getSprintList, { boardId })
      .then((res) => {
        if (res.success && res.data) {
          setSprints(res.data);
          return;
        }
        setError(res.error?.message ?? 'Failed to load sprint list');
      })
      .catch((err: Error) => setError(err.message));
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    invoke<ResolverResponse<ReleaseDto[]>>(RESOLVER_KEYS.getReleases, { boardId })
      .then((res) => {
        if (res.success && res.data) setReleases(res.data);
      })
      .catch(() => {/* releases are non-critical */});
  }, [boardId]);

  useEffect(() => {
    if (!selectedSprintId || !boardId) return;
    setLoading(true);
    setError(null);
    invoke<ResolverResponse<SprintStatsDto>>(RESOLVER_KEYS.getSprintStats, {
      boardId,
      sprintId: selectedSprintId,
    })
      .then((res) => {
        if (res.success && res.data) {
          setStats(res.data);
          setSelectedEpicKeys(new Set(res.data.epicBreakdowns.map((e) => e.epicKey)));
        } else {
          setError(res.error?.message ?? 'Failed to load');
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedSprintId, boardId]);

  const filtered = useMemo<FilteredStats | null>(() => {
    if (!stats) return null;
    const allKeys = stats.epicBreakdowns.map((e) => e.epicKey);
    const isAll = selectedEpicKeys.size === allKeys.length;
    const epics = isAll
      ? stats.epicBreakdowns
      : stats.epicBreakdowns.filter((e) => selectedEpicKeys.has(e.epicKey));
    const tickets = isAll
      ? stats.tickets
      : stats.tickets.filter((t) => selectedEpicKeys.has(t.epicKey ?? t.key));
    return {
      sprint: stats.sprint,
      totals: isAll ? stats.totals : recalcTotals(epics),
      epicBreakdowns: epics,
      tickets,
    };
  }, [stats, selectedEpicKeys]);

  const sprintReleases = useMemo(() => {
    if (!filtered) return [];
    const start = new Date(filtered.sprint.startDate).getTime();
    const end = new Date(filtered.sprint.endDate).getTime();
    return releases.filter((r) => {
      if (!r.releaseDate) return false;
      const rd = new Date(r.releaseDate).getTime();
      return rd >= start && rd <= end;
    });
  }, [releases, filtered]);

  const allEpics = stats?.epicBreakdowns ?? [];
  const allTickets = stats?.tickets ?? [];

  const toggleEpic = useCallback((epicKey: string) => {
    setSelectedEpicKeys((prev) => {
      const next = new Set(prev);
      if (next.has(epicKey)) next.delete(epicKey);
      else next.add(epicKey);
      return next;
    });
  }, []);

  const toggleAllEpics = useCallback(() => {
    if (!stats) return;
    const all = stats.epicBreakdowns.map((e) => e.epicKey);
    setSelectedEpicKeys((prev) => (prev.size === all.length ? new Set<string>() : new Set(all)));
  }, [stats]);

  return {
    boardId,
    sprints,
    releases: sprintReleases,
    selectedSprintId,
    setSelectedSprintId,
    loading,
    error,
    filtered,
    allEpics,
    allTickets,
    selectedEpicKeys,
    toggleEpic,
    toggleAllEpics,
  };
}
