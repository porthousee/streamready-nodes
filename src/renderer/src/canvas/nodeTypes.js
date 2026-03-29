import { SourceNode } from '../nodes/SourceNode';
import { OutputNode } from '../nodes/OutputNode';
import { CropNode } from '../nodes/CropNode';
import { TransformNode } from '../nodes/TransformNode';
import { BlurNode } from '../nodes/BlurNode';
import { MaskNode } from '../nodes/MaskNode';
import { CombinerNode } from '../nodes/CombinerNode';

export const nodeTypes = {
  sourceNode: SourceNode,
  outputNode: OutputNode,
  cropNode: CropNode,
  transformNode: TransformNode,
  blurNode: BlurNode,
  maskNode: MaskNode,
  combinerNode: CombinerNode,
};
