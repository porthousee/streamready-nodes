import { useGraphStore } from '../store/graphStore';

function NumberInput({ label, value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs text-muted font-sans">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="nodrag w-20 bg-bg border border-border rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-purple"
        />
        {unit && <span className="text-xs text-muted font-mono">{unit}</span>}
      </div>
    </div>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs text-muted font-sans">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="nodrag bg-bg border border-border rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-purple"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CropProps({ id, data }) {
  const update = useGraphStore(s => s.updateNodeData);
  const set = (key) => (val) => update(id, { [key]: val });
  return (
    <>
      <NumberInput label="Top" value={data.top} min={0} max={100} unit="%" onChange={set('top')} />
      <NumberInput label="Bottom" value={data.bottom} min={0} max={100} unit="%" onChange={set('bottom')} />
      <NumberInput label="Left" value={data.left} min={0} max={100} unit="%" onChange={set('left')} />
      <NumberInput label="Right" value={data.right} min={0} max={100} unit="%" onChange={set('right')} />
    </>
  );
}

function TransformProps({ id, data }) {
  const update = useGraphStore(s => s.updateNodeData);
  const set = (key) => (val) => update(id, { [key]: val });
  return (
    <>
      <NumberInput label="X" value={data.x} unit="px" onChange={set('x')} />
      <NumberInput label="Y" value={data.y} unit="px" onChange={set('y')} />
      <NumberInput label="Scale" value={data.scale} min={0.1} max={10} step={0.1} onChange={set('scale')} />
    </>
  );
}

function BlurProps({ id, data }) {
  const update = useGraphStore(s => s.updateNodeData);
  const set = (key) => (val) => update(id, { [key]: val });
  return (
    <>
      <NumberInput label="Amount" value={data.amount} min={0} max={100} onChange={set('amount')} />
      <SelectInput label="Type" value={data.blurType} options={['gaussian', 'box']} onChange={set('blurType')} />
    </>
  );
}

const PANELS = {
  cropNode: CropProps,
  transformNode: TransformProps,
  blurNode: BlurProps,
};

export function PropertiesPanel() {
  const nodes = useGraphStore(s => s.nodes);
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const node = nodes.find(n => n.id === selectedNodeId);

  if (!node || !PANELS[node.type]) {
    return (
      <div className="w-56 border-l border-border bg-surface p-4 flex items-center justify-center">
        <p className="text-xs text-muted text-center">Select a node to edit its properties</p>
      </div>
    );
  }

  const Panel = PANELS[node.type];
  return (
    <div className="w-56 border-l border-border bg-surface p-4 overflow-y-auto">
      <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-3 font-sans">{node.type.replace('Node', '')}</h3>
      <Panel id={node.id} data={node.data} />
    </div>
  );
}
