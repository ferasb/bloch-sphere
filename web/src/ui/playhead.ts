import type { Sphere, Step } from "../model/sphere";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** How long a step plays, in ms: grows with its largest rotation (45° ≈ 0.4 s, 180° = 0.8 s). */
function stepDuration(step: Step): number {
  let angle = 0;
  for (const motion of step.motions.values()) {
    angle = Math.max(angle, motion.kind === "rotate" ? motion.angle : Math.PI / 4);
  }
  return 300 + (500 * angle) / Math.PI;
}

interface PlayheadStore {
  getState(): { sphere: Sphere; playhead: number };
  setState(partial: { playhead: number }): void;
}

/**
 * Animates a store's playhead toward the end of its journey, one step at a time. Each room's store
 * gets its own player.
 */
export function makePlayer(store: PlayheadStore): { play(): void; stop(): void } {
  let raf = 0;
  let lastTime = 0;

  function tick(now: number): void {
    const { sphere, playhead } = store.getState();
    const target = sphere.lastIndex;
    if (playhead >= target || reducedMotion.matches) {
      raf = 0;
      store.setState({ playhead: target });
      return;
    }
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    const boundary = Math.floor(playhead) + 1;
    // With several steps queued (fast clicking), play faster so the picture keeps up.
    const catchUp = Math.max(1, target - playhead);
    const next = playhead + (dt / stepDuration(sphere.steps[boundary])) * catchUp;
    store.setState({ playhead: Math.min(next, boundary) });
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
