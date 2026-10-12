import { Line } from "@react-three/drei";
import { scenePalette } from "../palette";
import { toVector3 } from "./geometry";
import { useSceneSource } from "./source";

const LENGTH = 1.3;

/**
 * The dashed axis of the step on screen: the one playing, or the last one. With
 * `whilePlayingOnly`, only while a step plays (the Gate Lab shows the combined axis at rest).
 */
export function RotationAxis({ whilePlayingOnly = false }: { whilePlayingOnly?: boolean }) {
  const source = useSceneSource();
  const axis = source.use((s) => s.timeline.axis(s.timeline.at(s.playhead).step));
  const playing = source.use((s) => s.playhead < s.timeline.lastIndex);
  if (!axis || (whilePlayingOnly && !playing)) {
    return null;
  }
  const end = toVector3(axis).multiplyScalar(LENGTH);
  return (
    <Line
      points={[end.clone().negate(), end]}
      color={scenePalette().rotationAxis}
      lineWidth={1.5}
      dashed
      dashSize={0.06}
      gapSize={0.045}
    />
  );
}
