type LozengeAppearance = 'default' | 'inprogress' | 'moved' | 'success';

export function statusAppearance(status: string): LozengeAppearance {
  const s = status.toLowerCase();
  if (['done', 'closed', 'waiting for production'].includes(s)) return 'success';
  if (s.includes('progress') || s === 'in review') return 'inprogress';
  if (s.includes('block')) return 'moved';
  return 'default';
}
