import type { ProgressView } from '../lib/useGitProgress'

interface Props {
  progress: ProgressView | null
  /** Shown until git reports its first progress line */
  fallback: string
}

export function ProgressBar({ progress, fallback }: Props): JSX.Element {
  const percent = progress?.percent ?? null
  return (
    <div className="progress-row" role="progressbar" aria-valuenow={percent ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-track">
        <div
          className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      <span className="progress-label">
        {progress ? progress.label : fallback}
        {percent !== null && ` · ${percent}%`}
      </span>
    </div>
  )
}
