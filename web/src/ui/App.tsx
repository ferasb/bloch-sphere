import { ChallengeCard, ChallengeTarget } from "./controls/Challenges";
import { GateToolbar } from "./controls/GateToolbar";
import { QubitStrip } from "./controls/QubitStrip";
import { ThemeButton } from "./controls/ThemeButton";
import { GateLab } from "./lab/GateLab";
import { NARROW, TOUCH, useMedia } from "./media";
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
  const narrow = useMedia(NARROW);
  return (
    <div className="app">
      <header className="topbar">
        <a className="topbar-learn" href="learn/">
          Learn the basics ›
        </a>
        <div className="topbar-title">
          <h1>Bloch Sphere</h1>
          <p>Apply gates to qubits and watch their states rotate.</p>
        </div>
        <div className="topbar-side">
          <nav className="room-switcher" aria-label="Rooms">
            {ROOMS.map(([id, label]) => (
              <button key={id} type="button" aria-current={room === id ? "page" : undefined} onClick={() => goToRoom(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="topbar-end">
            <nav className="topbar-links" aria-label="About this site">
              <a href="about.html">About</a>
              <a href="privacy.html">Privacy</a>
            </nav>
            <ThemeButton />
          </div>
        </div>
      </header>
      {room === "sphere" ? <SphereRoom /> : narrow ? <LabTooNarrow /> : <GateLab />}
    </div>
  );
}

/**
 * Center: the sphere, with its controls along its top (qubits) and bottom (gates). Right: one
 * sidebar explaining what you see (state, gate). Bottom: what happened. (design.md §5)
 */
function SphereRoom() {
  useShortcuts();
  const touch = useMedia(TOUCH);
  return (
    <>
      <main className="scene" aria-label="Bloch sphere">
        <QubitStrip />
        <div className="viewport">
          {/* Over the sphere on a wide screen; above it on a narrow one (design.md §5.1). */}
          <ChallengeCard />
          <div className="viewport-sphere">
            <Scene source={journeySource}>
              <ChallengeTarget />
            </Scene>
            <p className="scene-hint">{touch ? "Drag to rotate · Pinch to zoom" : "Drag to rotate · Scroll to zoom"}</p>
            <RestoreNotice />
            <LibraryNotice />
          </div>
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

/** The Gate Lab on a narrow screen: it needs the width (design.md §5.1), so say so and offer the way back. */
function LabTooNarrow() {
  return (
    <main className="lab-narrow" aria-labelledby="lab-narrow-heading">
      <h2 id="lab-narrow-heading">The Gate Lab needs a wider screen</h2>
      <p>
        It's where you combine gates into your own. It shows your gates, a test sphere and the result side by side, and they don't fit on a screen
        this narrow. Open it on a computer, or on a tablet held sideways.
      </p>
      <div className="lab-narrow-actions">
        <button type="button" className="button-accent" onClick={() => goToRoom("sphere")}>
          Back to the sphere
        </button>
        <a href="learn/gate-lab/">About the Gate Lab ›</a>
      </div>
    </main>
  );
}
