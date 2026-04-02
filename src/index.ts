import Resolver from '@forge/resolver';
import api, { assumeTrustedRoute } from '@forge/api';
import kvs from '@forge/kvs';

import { DomainError } from './domain';
import { ComputeSprintStats, GetSprintList } from './usecases';
import {
  discoverFieldIds,
  fetchProjectReleases,
  ForgeStorageAdapter,
  getProjectKeyForBoard,
  JiraIssueRepository,
  JiraSprintRepository,
} from './adapters';
import type { FieldIds } from './adapters';
import { RESOLVER_KEYS } from './shared';
import type { GetReleasesPayload, GetSprintListPayload, GetSprintStatsPayload } from './shared';

const jiraApi = {
  async fetch(path: string): Promise<Response> {
    const resp = await api.asApp().requestJira(assumeTrustedRoute(path));
    return resp as unknown as Response;
  },
};

const forgeStorage = {
  get: (key: string) => kvs.get(key),
  set: (key: string, value: Record<string, unknown>) => kvs.set(key, value),
  delete: (key: string) => kvs.delete(key),
};

const FIELD_CACHE_KEY = 'sys:fieldIds';
const FIELD_CACHE_TTL = 60 * 60 * 1000;

async function getFieldIds(): Promise<FieldIds> {
  const cached = await kvs.get(FIELD_CACHE_KEY) as
    | { data: FieldIds; ts: number }
    | undefined;
  if (cached && Date.now() - cached.ts < FIELD_CACHE_TTL) return cached.data;

  const ids = await discoverFieldIds(jiraApi);
  await kvs.set(FIELD_CACHE_KEY, { data: ids, ts: Date.now() });
  return ids;
}

async function createDeps() {
  const fieldIds = await getFieldIds();
  return {
    sprintRepo: new JiraSprintRepository(jiraApi),
    issueRepo: new JiraIssueRepository(jiraApi, fieldIds.storyPointsField, fieldIds.sprintField),
    storage: new ForgeStorageAdapter(forgeStorage),
  };
}

function handleError(err: unknown) {
  if (err instanceof DomainError) {
    return { success: false, error: { code: err.code, message: err.message } };
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  return { success: false, error: { code: 'INTERNAL_ERROR', message } };
}

const resolver = new Resolver();

resolver.define(RESOLVER_KEYS.getSprintList, async (req) => {
  try {
    const { boardId } = req.payload as unknown as GetSprintListPayload;
    const deps = await createDeps();
    const useCase = new GetSprintList({ sprintRepo: deps.sprintRepo });
    return { success: true, data: await useCase.execute({ boardId }) };
  } catch (err) {
    return handleError(err);
  }
});

resolver.define(RESOLVER_KEYS.getSprintStats, async (req) => {
  try {
    const { boardId, sprintId, forceRefresh } =
      req.payload as unknown as GetSprintStatsPayload;
    const deps = await createDeps();
    const useCase = new ComputeSprintStats(deps);
    return {
      success: true,
      data: await useCase.execute({ boardId, sprintId, forceRefresh }),
    };
  } catch (err) {
    return handleError(err);
  }
});

resolver.define(RESOLVER_KEYS.getReleases, async (req) => {
  try {
    const { boardId } = req.payload as unknown as GetReleasesPayload;
    const projectKey = await getProjectKeyForBoard(jiraApi, boardId);
    const releases = await fetchProjectReleases(jiraApi, projectKey);
    return { success: true, data: releases };
  } catch (err) {
    return handleError(err);
  }
});

export const handler = resolver.getDefinitions();
