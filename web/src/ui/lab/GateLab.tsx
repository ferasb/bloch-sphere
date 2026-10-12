import { LibraryNotice } from "../panels/LibraryNotice";
import { Scene } from "../scene/Scene";
import { sourceFrom } from "../scene/source";
import { Bench } from "./Bench";
import { Ingredients } from "./Ingredients";
import { ReversedPath, ShortcutArc } from "./LabLayers";
import { useLab } from "./labStore";
import { ResultPanel } from "./ResultPanel";
import { SaveBar } from "./SaveBar";
import { TestControls } from "./TestControls";
import { useLabShortcuts } from "./useLabShortcuts";
import { journeyProjector } from "../view";

/** The lab's test sphere draws its test journey. */
const labSource = sourceFrom(useLab, journeyProjector());

/**
 * The Gate Lab (design-gates.md §3): the same grammar as the sphere room. Ingredients above, the test
 * sphere, the bench below, one sidebar for the result, and saving along the bottom.
 */
export function GateLab() {
  useLabShortcuts();
  const several = useLab((s) => s.tiles.length > 1);
  return (
    <>
      <main className="scene" aria-label="Gate Lab">
        <Ingredients />
        <div className="viewport">
          <Scene source={labSource} stepAxis={several ? "while-playing" : "always"}>
            <ShortcutArc />
            <ReversedPath />
          </Scene>
          <TestControls />
          <LibraryNotice />
        </div>
        <Bench />
      </main>
      <aside className="panel" aria-label="Result">
        <ResultPanel />
      </aside>
      <SaveBar />
    </>
  );
}
