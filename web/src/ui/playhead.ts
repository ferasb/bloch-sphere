import type { Sphere, Step } from "../model/sphere";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** How long a rotation plays, in ms: grows with the angle (45° ≈ 0.4 s, 180° = 0.8 s). */
export function rotationDuration(angle: number): number {
  return 300 + (500 * angle) / Math.PI;
}

/** How long a journey step plays: as long as its largest rotation. */
function stepDuration(step: Step): number {
  let angle = 0;
  for (const motion of step.motions.values()) {
    angle = Math.max(angle, motion.kind === "rotate" ? motion.angle : Math.PI / 4);
  }
  return rotationDuration(angle);
}

/** What a player needs from a room: where the playhead is, where it's going, and how long each step takes. */
export interface PlayheadDriver {
  playhead(): number;
  target(): number;
  /** Milliseconds to play step k (from t = k − 1 to k). */
  duration(step: number): number;
  setPlayhead(t: number): void;
}

/** Animates a playhead toward its target, one step at a time. Each room gets its own player. */
export function makePlayer(driver: PlayheadDriver): { play(): void; stop(): void } {
  let raf = 0;
  let lastTime = 0;

  function tick(now: number): void {
    const playhead = driver.playhead();
    const target = driver.target();
    if (playhead >= target || reducedMotion.matches) {
      raf = 0;
      driver.setPlayhead(target);
      return;
    }
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    const boundary = Math.floor(playhead) + 1;
    // With several steps queued (fast clicking), play faster so the picture keeps up.
    const catchUp = Math.max(1, target - playhead);
    const next = playhead + (dt / driver.duration(boundary)) * catchUp;
    driver.setPlayhead(Math.min(next, boundary, target));
    raf = requestAnimationFrame(tick);
  }

  return {
    play() {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

/** A player for a store holding a journey: it plays to the journey's end. */
export function journeyPlayer(store: { getState(): { sphere: Sphere; playhead: number }; setState(partial: { playhead: number }): void }) {
  return makePlayer({
    playhead: () => store.getState().playhead,
    target: () => store.getState().sphere.lastIndex,
    duration: (step) => stepDuration(store.getState().sphere.steps[step]),
    setPlayhead: (t) => store.setState({ playhead: t }),
  });
}
