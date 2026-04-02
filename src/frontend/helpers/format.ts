export function fmt(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export function pct(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'No date';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
