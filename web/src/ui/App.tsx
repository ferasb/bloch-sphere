import { GateToolbar } from "./controls/GateToolbar";
import { QubitStrip } from "./controls/QubitStrip";
import { GateLab } from "./lab/GateLab";
import { GatePanel } from "./panels/GatePanel";
import { JourneyBar } from "./panels/JourneyBar";
import { LibraryNotice } from "./panels/LibraryNotice";
import { RestoreNotice } from "./panels/RestoreNotice";
import { StatePanel } from "./panels/StatePanel";
import { goToRoom, useRoom, type Room } from "./rooms";
import { Scene } from "./scene/Scene";
import { sourceFrom } from "./scene/source";
import { useApp } from "./store";
import { useShortcuts } from "./useShortcuts";
import { journeyProjector } from "./view";

/** The main room's sphere draws the journey. */
const journeySource = sourceFrom(useApp, journeyProjector());

const ROOMS: [Room, string][] = [
  ["sphere", "Sphere"],
  ["lab", "Gate Lab"],
];

/** The shell: the title, the room switcher, and whichever room is open (design-gates.md §5). */
export function App() {
  const room = useRoom();
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>Bloch Sphere</h1>
          <p>Apply gates to qubits and watch their states rotate.</p>
        </div>
        <nav className="room-switcher" aria-label="Rooms">
          {ROOMS.map(([id, label]) => (
            <button key={id} type="button" aria-current={room === id ? "page" : undefined} onClick={() => goToRoom(id)}>
              {label}
            </button>
          ))}
        </nav>
        <a className="topbar-link" href="privacy.html">
          Privacy
        </a>
      </header>
      {room === "lab" ? <GateLab /> : <SphereRoom />}
    </div>
  );
}

/**
 * Center: the sphere, with its controls along its top (qubits) and bottom (gates). Right: one
 * sidebar explaining what you see (state, gate). Bottom: what happened. (design.md §5)
 */
function SphereRoom() {
  useShortcuts();
  return (
    <>
      <main className="scene" aria-label="Bloch sphere">
        <QubitStrip />
        <div className="viewport">
          <Scene source={journeySource} />
          <p className="scene-hint">Drag to rotate · Scroll to zoom</p>
          <RestoreNotice />
          <LibraryNotice />
        </div>
        <GateToolbar />
      </main>
      <aside className="panel" aria-label="State and gate">
        <StatePanel />
        <GatePanel />
      </aside>
      <JourneyBar />
    </>
  );
}
