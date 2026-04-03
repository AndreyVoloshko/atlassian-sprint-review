import { xcss } from '@forge/react';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const sidebarBox = xcss({
  width: '280px',
  minWidth: '280px',
});

export const mainBox = xcss({
  flexGrow: 1,
});

// ---------------------------------------------------------------------------
// KPI cards (color-coded by category)
// ---------------------------------------------------------------------------

export const plannedCardBox = xcss({
  backgroundColor: 'color.background.accent.purple.subtlest',
  padding: 'space.150',
  borderRadius: 'radius.small',
});

export const addedCardBox = xcss({
  backgroundColor: 'color.background.accent.yellow.subtlest',
  padding: 'space.150',
  borderRadius: 'radius.small',
});

export const completedCardBox = xcss({
  backgroundColor: 'color.background.accent.green.subtlest',
  padding: 'space.150',
  borderRadius: 'radius.small',
});

// ---------------------------------------------------------------------------
// Progress bars
// ---------------------------------------------------------------------------

export const barTrack = xcss({
  height: '6px',
  backgroundColor: 'color.background.neutral',
  borderRadius: 'radius.xsmall',
  overflow: 'hidden',
});

export function barFill(widthPct: number, bgToken: string, overflow = false) {
  return xcss({
    height: '6px',
    width: `${widthPct}%`,
    backgroundColor: bgToken,
    ...(overflow ? { overflow: 'hidden' as const } : {}),
  } as Parameters<typeof xcss>[0]);
}

export type BarColor = 'purple' | 'yellow' | 'green';

export const COMPLETION_BAR_TOKENS: Record<BarColor, string> = {
  purple: 'color.background.accent.purple.bolder',
  yellow: 'color.background.accent.yellow.bolder',
  green: 'color.background.accent.green.bolder',
};

export const STATUS_DONE_TOKEN = 'color.background.success.bold';
export const STATUS_IN_PROGRESS_TOKEN = 'color.background.information.bold';

// ---------------------------------------------------------------------------
// Sidebar sections
// ---------------------------------------------------------------------------

export const sidebarSectionBox = xcss({
  padding: 'space.150',
  borderRadius: 'radius.small',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
});

export const sidebarCardBox = xcss({
  backgroundColor: 'color.background.neutral',
  padding: 'space.100',
  borderRadius: 'radius.small',
});

// ---------------------------------------------------------------------------
// Epic color dot (maps Jira color_N keys to ADS tokens)
// ---------------------------------------------------------------------------

const JIRA_COLOR_TOKENS: Record<string, string> = {
  color_1: 'color.background.accent.purple.bolder',
  color_2: 'color.background.accent.blue.bolder',
  color_3: 'color.background.accent.teal.bolder',
  color_4: 'color.background.accent.green.bolder',
  color_5: 'color.background.accent.green.bolder',
  color_6: 'color.background.accent.yellow.bolder',
  color_7: 'color.background.accent.orange.bolder',
  color_8: 'color.background.accent.red.bolder',
  color_9: 'color.background.accent.red.bolder',
  color_10: 'color.background.accent.magenta.bolder',
  color_11: 'color.background.accent.purple.bolder',
  color_12: 'color.background.accent.gray.bolder',
  color_13: 'color.background.accent.green.bolder',
  color_14: 'color.background.accent.teal.bolder',
};

const DEFAULT_EPIC_TOKEN = 'color.background.accent.magenta.bolder';

export function epicColorDot(colorKey: string | null) {
  const token = (colorKey && JIRA_COLOR_TOKENS[colorKey]) ?? DEFAULT_EPIC_TOKEN;
  return xcss({
    width: '14px',
    height: '14px',
    borderRadius: 'radius.xsmall',
    backgroundColor: token,
    flexShrink: '0',
  } as Parameters<typeof xcss>[0]);
}