import { TRACKS, TRACK_LABELS } from '../lib/tracks';
import type { Track } from '../lib/tracks';

type Props = {
  current: Track;
  onChange: (t: Track) => void;
};

export function TrackTabs({ current, onChange }: Props) {
  return (
    <div className="track-tabs" role="tablist">
      {TRACKS.map((track) => (
        <button
          key={track}
          role="tab"
          aria-current={current === track ? 'page' : undefined}
          className={`track-tab${current === track ? ' track-tab--active' : ''}`}
          onClick={() => onChange(track)}
        >
          {TRACK_LABELS[track]}
        </button>
      ))}
    </div>
  );
}
