export function ProgressBar({ progress, status }) {
  if (status === 'idle') return null;

  const label = status === 'rendering' ? `Rendering… ${progress}%`
    : status === 'done' ? 'Done!'
    : status === 'error' ? 'Render failed'
    : '';

  const color = status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple to-pink';

  return (
    <div className="h-8 bg-surface border-t border-border flex items-center px-4 gap-3">
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${status === 'done' ? 100 : progress}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted whitespace-nowrap">{label}</span>
    </div>
  );
}
