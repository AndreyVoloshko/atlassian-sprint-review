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