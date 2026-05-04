export const TRACKS = ['production', 'beta', 'dev'] as const;
export type Track = typeof TRACKS[number];
export const TRACK_LABELS: Record<Track, string> = {
  production: '프로덕션',
  beta: '베타',
  dev: '개발',
};
export function isTrack(v: string): v is Track {
  return (TRACKS as readonly string[]).includes(v);
}
