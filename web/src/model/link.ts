import { NAMED_STATES, Qubit } from "../math/qubit";
import { MAX_QUBITS, type FixedGateName, type GateSpec } from "./sphere";

/**
 * Links that open the site set up: starting states and gates to play, written so a person can read
 * and type them. The Learn pages use them for their "Try it" links (design.md §9).
 *
 *   #/?start=0&gates=H             the Sphere room: q1 at |0⟩, then H, played
 *   #/?start=0,1&gates=H,Z         two qubits; every gate acts on all of them
 *   #/?start=60:45                 a state by its angles: θ 60°, φ 45°
 *   #/?gates=Rx(90),Sdg            a rotation by any angle (degrees); S† may be written Sdg
 *   #/lab?gates=H,T,H&start=+      the Gate Lab: these tiles on the bench, tested on |+⟩
 *
 * States are 0, 1, +, -, +i, -i or θ:φ (the lab takes only the six named ones). Links come from
 * anywhere, so parsing validates everything and an invalid link opens the site as usual.
 */
export type Link =
  | { room: "sphere"; start: Qubit[]; gates: GateSpec[] }
  | { room: "lab"; start: Qubit; gates: GateSpec[] };

export const MAX_LINK_GATES = 24;

const STATE_WORDS: Record<string, Qubit> = {
  "0": NAMED_STATES[0].state,
  "1": NAMED_STATES[1].state,
  "+": NAMED_STATES[2].state,
  "-": NAMED_STATES[3].state,
  "+i": NAMED_STATES[4].state,
  "-i": NAMED_STATES[5].state,
};

const FIXED: readonly FixedGateName[] = ["X", "Y", "Z", "H", "S", "T", "S†", "T†"];

/** The link in a URL hash, or null when there's none or it isn't valid. */
export function parseLink(hash: string): Link | null {
  const match = hash.match(/^#\/(lab)?\?(.*)$/);
  if (!match) {
    return null;
  }
  const params = new Map<string, string>();
  for (const pair of match[2].split("&")) {
    const [key, value = ""] = pair.split("=");
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return null;
    }
    if (!["start", "gates"].includes(key) || params.has(key)) {
      return null;
    }
    params.set(key, decoded);
  }

  const start = (params.get("start") ?? "0").split(",").map(parseState);
  const gateText = params.get("gates") ?? "";
  const gates = gateText === "" ? [] : gateText.split(",").map(parseGate);
  if (start.some((q) => q === null) || gates.some((g) => g === null) || gates.length > MAX_LINK_GATES) {
    return null;
  }
  const qubits = start as Qubit[];
  if (match[1] === "lab") {
    // The lab tests on one of the six axis states.
    const named = qubits.length === 1 && NAMED_STATES.some(({ state }) => state === qubits[0]);
    return named ? { room: "lab", start: qubits[0], gates: gates as GateSpec[] } : null;
  }
  return qubits.length <= MAX_QUBITS ? { room: "sphere", start: qubits, gates: gates as GateSpec[] } : null;
}

/** The hash for a link, in the form parseLink reads. States are named (0, +, …) or θ:φ. */
export function linkHash(link: Link): string {
  const start = link.room === "lab" ? [link.start] : link.start;
  const parts = [`start=${start.map(stateWord).join(",")}`];
  if (link.gates.length > 0) {
    parts.push(`gates=${link.gates.map(gateWord).join(",")}`);
  }
  return `#/${link.room === "lab" ? "lab" : ""}?${parts.join("&")}`;
}

function parseState(text: string): Qubit | null {
  const word = text.replace("−", "-");
  if (word in STATE_WORDS) {
    return STATE_WORDS[word];
  }
  const angles = word.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!angles) {
    return null;
  }
  const [theta, phi] = [Number(angles[1]), Number(angles[2])];
  return theta <= 180 && phi < 360 ? Qubit.fromBlochAngles((theta * Math.PI) / 180, (phi * Math.PI) / 180) : null;
}

function parseGate(text: string): GateSpec | null {
  const name = text.replace(/dg$/, "†");
  if ((FIXED as readonly string[]).includes(name)) {
    return { name: name as FixedGateName };
  }
  const rotation = text.match(/^R([xyz])\((-?\d+(?:\.\d+)?)\)$/);
  if (!rotation || Math.abs(Number(rotation[2])) > 720) {
    return null;
  }
  return { name: `R${rotation[1]}` as "Rx" | "Ry" | "Rz", angle: (Number(rotation[2]) * Math.PI) / 180 };
}

function stateWord(q: Qubit): string {
  const named = Object.entries(STATE_WORDS).find(([, state]) => state.isEquivalent(q, 1e-12));
  if (named) {
    return named[0];
  }
  const [theta, phi] = q.blochAngles().map((a) => +((a * 180) / Math.PI).toFixed(2));
  return `${theta}:${phi}`;
}

function gateWord(spec: GateSpec): string {
  switch (spec.name) {
    case "Rx":
    case "Ry":
    case "Rz":
      return `${spec.name}(${+((spec.angle * 180) / Math.PI).toFixed(2)})`;
    case "custom":
      throw new Error("Links can't carry custom gates");
    default:
      return spec.name.replace("†", "dg");
  }
}
