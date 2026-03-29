import { Handle, Position } from '@xyflow/react';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {'source'|'processing'|'output'} props.variant
 * @param {boolean} [props.hasInput=true]
 * @param {boolean} [props.hasOutput=true]
 * @param {string} [props.inputId='in-video']
 * @param {string} [props.outputId='out-video']
 * @param {React.ReactNode} props.children
 */
export function NodeShell({ title, variant, hasInput = true, hasOutput = true, inputId = 'in-video', outputId = 'out-video', children }) {
  const borderColor = variant === 'source' ? 'border-purple' : variant === 'output' ? 'border-pink' : 'border-border';
  const titleColor = variant === 'source' ? 'text-purple' : variant === 'output' ? 'text-pink' : 'text-white';

  return (
    <div className={`bg-surface border ${borderColor} rounded-lg min-w-[160px] shadow-lg`}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id={inputId}
          className="!w-3 !h-3 !bg-purple !border-2 !border-bg"
        />
      )}
      <div className={`px-3 py-1.5 border-b border-border text-xs font-semibold font-sans uppercase tracking-wide ${titleColor}`}>
        {title}
      </div>
      <div className="px-3 py-2 text-xs font-mono text-muted">
        {children}
      </div>
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id={outputId}
          className="!w-3 !h-3 !bg-pink !border-2 !border-bg"
        />
      )}
    </div>
  );
}
