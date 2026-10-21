import { labelTex } from "../../format/gateFacts";
import { gateListText } from "../../format/gateNames";
import { CHALLENGES, challengeById, progress, targetVector, type Challenge } from "../../model/challenges";
import { TargetMarker } from "../scene/TargetMarker";
import { useApp } from "../store";
import { Popover } from "../widgets/Popover";
import { QubitTag } from "../widgets/QubitTag";
import { Tex } from "../widgets/Tex";

/** Stars earned, out of three; shown as a word to screen readers. */
function Stars({ n }: { n: number }) {
  return (
    <span className="stars" role="img" aria-label={`${n} of 3 stars`}>
      {"★".repeat(n)}
      <span className="stars-empty">{"★".repeat(3 - n)}</span>
    </span>
  );
}

/** "|0⟩ → |+i⟩" */
function Route({ c }: { c: Challenge }) {
  return <Tex tex={`${labelTex(c.from)} \\to ${labelTex(c.to)}`} />;
}

/** In the qubit strip: the list of challenges, with the stars earned in each. */
export function ChallengesButton() {
  const stars = useApp((s) => s.stars);
  const current = useApp((s) => s.challenge);
  const { startChallenge } = useApp.getState();
  return (
    <Popover id="challenges" button="Challenges ▾" buttonClassName="button-small challenges-button" label="Challenges" heading="Challenges" align="end">
      {(close) => (
        <>
          <p className="hint">Get q1 to the goal using only the gates given, in as few as you can.</p>
          <ol className="challenge-list">
            {CHALLENGES.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={c.id === current || undefined}
                  onClick={() => {
                    startChallenge(c.id);
                    close();
                  }}
                >
                  <span className="challenge-name">
                    {i + 1}. {c.title}
                  </span>
                  <span className="challenge-route">
                    <Route c={c} /> using {gateListText(c.gates, "and")}
                  </span>
                  <Stars n={stars[c.id] ?? 0} />
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </Popover>
  );
}

/** Over the sphere while a challenge is on: the goal, how it's going, and what's next. */
export function ChallengeCard() {
  const c = useApp((s) => challengeById(s.challenge));
  const sphere = useApp((s) => s.sphere);
  // Solved once the last gate has finished playing, not as soon as it's clicked.
  const settled = useApp((s) => s.live && s.playhead >= s.sphere.lastIndex);
  const { startChallenge, leaveChallenge, reset } = useApp.getState();
  if (!c) {
    return null;
  }
  const index = CHALLENGES.indexOf(c);
  const next = CHALLENGES[index + 1];
  const { gates, solved, stars } = progress(c, sphere);
  const plural = (n: number) => `${n} gate${n === 1 ? "" : "s"}`;
  return (
    <section className="challenge-card" aria-label="Challenge">
      <div className="challenge-head">
        <h2>
          Challenge {index + 1} of {CHALLENGES.length}: {c.title}
        </h2>
        <button type="button" className="link-button" onClick={leaveChallenge}>
          Leave
        </button>
      </div>
      <p>
        Get <QubitTag name="q1" colorSlot={1} /> from <Tex tex={labelTex(c.from)} /> to <Tex tex={labelTex(c.to)} /> using only{" "}
        <strong>{gateListText(c.gates, "and")}</strong>. The ring marks the goal.
      </p>
      {solved && settled ? (
        <div className="challenge-solved" role="status">
          <p>
            <span aria-hidden>✓</span> Solved in {plural(gates)}. <Stars n={stars} />
            {gates > c.par && <span className="hint"> It can be done in {plural(c.par)}.</span>}
          </p>
          {next ? (
            <button type="button" className="button-small button-accent" onClick={() => startChallenge(next.id)}>
              Next challenge ›
            </button>
          ) : (
            <p className="hint">That was the last one. Well done!</p>
          )}
        </div>
      ) : (
        <>
          <p className="challenge-status">
            Gates used: {gates} · Fewest possible: {c.par}
          </p>
          <div className="challenge-actions">
            <details>
              <summary>Hint</summary>
              <p className="hint">{c.hint}</p>
            </details>
            <button type="button" className="button-small" onClick={reset} disabled={gates === 0}>
              Start over
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** On the sphere while a challenge is on: a ring at the goal. */
export function ChallengeTarget() {
  const c = useApp((s) => challengeById(s.challenge));
  return c ? <TargetMarker to={targetVector(c)} colorSlot={1} /> : null;
}
