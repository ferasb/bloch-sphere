/**
 * Short definitions of the words the app shows, in beginner language. The app opens them from its
 * labels (ui/widgets/Term.tsx), and the Learn hub lists them. `learn` is the Learn page that explains
 * more (a site path, as in src/learn/pages.tsx; a test checks it exists).
 */
export interface GlossaryEntry {
  term: string;
  definition: string;
  learn: string;
}

export const GLOSSARY = {
  qubit: {
    term: "Qubit",
    definition: "The quantum version of a bit. Measuring it gives 0 or 1, but before that its state can be a superposition of |0⟩ and |1⟩.",
    learn: "learn/qubit/",
  },
  state: {
    term: "State |ψ⟩",
    definition: "Everything there is to know about the qubit, written as a ket: α|0⟩ + β|1⟩. On the sphere, it's the arrow.",
    learn: "learn/qubit/",
  },
  amplitude: {
    term: "Amplitudes α and β",
    definition: "The two numbers in α|0⟩ + β|1⟩. Each is a complex number: its size squared is a probability, and its angle is its phase.",
    learn: "learn/qubit/",
  },
  vector: {
    term: "State vector",
    definition: "The state as a column of its two amplitudes, α on top and β below: the form a gate's matrix multiplies.",
    learn: "learn/gates/",
  },
  circles: {
    term: "Circle notation",
    definition: "One circle per basis state, |0⟩ and |1⟩. The filled area is the probability, and the direction of the line shows the amplitude's phase.",
    learn: "learn/qubit/",
  },
  probability: {
    term: "Probabilities P(0) and P(1)",
    definition: "The chances that measuring gives 0 or 1: P(0) = |α|² and P(1) = |β|². On the sphere, the higher the arrow, the likelier 0.",
    learn: "learn/measurement/",
  },
  theta: {
    term: "θ (theta)",
    definition: "How far the arrow tilts down from |0⟩ at the top: 0° is |0⟩, 90° is the equator (50/50), 180° is |1⟩.",
    learn: "learn/bloch-sphere/",
  },
  phi: {
    term: "φ (phi)",
    definition: "The relative phase: the angle around the equator, from |+⟩ toward |+i⟩. It has no meaning at the poles, where θ is 0° or 180°.",
    learn: "learn/bloch-sphere/",
  },
  coordinates: {
    term: "Bloch vector (x, y, z)",
    definition: "Where the arrow points: x toward |+⟩, y toward |+i⟩ and z toward |0⟩. For a single qubit it always has length 1.",
    learn: "learn/bloch-sphere/",
  },
  matrix: {
    term: "Gate matrix",
    definition: "A gate as a 2×2 grid of numbers. Multiplying the state vector by it gives the new state; column j is where |j⟩ goes.",
    learn: "learn/gates/",
  },
  rotation: {
    term: "Rotation",
    definition: "Every one-qubit gate turns the whole sphere about an axis by an angle, counterclockwise as seen from the axis's tip.",
    learn: "learn/gates/",
  },
  globalPhase: {
    term: "Global phase",
    definition: "A factor such as −1 or i in front of the whole state. No measurement can detect it, so the sphere doesn't show it.",
    learn: "learn/bloch-sphere/",
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;
