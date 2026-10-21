import type { ReactNode } from "react";
import { GLOSSARY } from "../format/glossary";
import { A, Section } from "./components";
import { BlochSphere } from "./guides/blochSphere";
import { GateLab } from "./guides/gateLab";
import { Hadamard, PauliX, PauliY, PauliZ, RotationGates, SAndT } from "./guides/gateGuides";
import { Gates } from "./guides/gates";
import { KeyStates } from "./guides/keyStates";
import { Measurement } from "./guides/measurement";
import { Qubit } from "./guides/qubit";

/** A Learn page. The order of PAGES is the reading order; the first is the Learn hub. */
export interface Page {
  /** Where it's served: "learn/qubit/". A page under another's path sits under it in the breadcrumbs. */
  path: string;
  /** Short name, for breadcrumbs, the guide list and Previous/Next. */
  name: string;
  /** The browser tab and search result title: at most 60 characters. */
  title: string;
  /** The page's h1. */
  heading: string;
  /** The search result snippet and the guide list's summary: at most 155 characters. */
  description: string;
  Body: () => ReactNode;
}

function Hub() {
  const guides = PAGES.slice(1);
  const top = guides.filter((g) => !g.path.startsWith("learn/gates/") || g.path === "learn/gates/");
  return (
    <>
      <p className="lead">
        Short guides to one qubit and the Bloch sphere, for anyone meeting quantum computing for the first time. Each explains an idea in plain
        words first, then shows the math, then lets you try it on the live sphere.
      </p>
      <ol className="guide-list">
        {top.map((g) => (
          <li key={g.path}>
            <A to={g.path}>{g.name}</A>
            <p>{g.description}</p>
            {g.path === "learn/gates/" && (
              <ol>
                {guides
                  .filter((c) => c.path.startsWith("learn/gates/") && c !== g)
                  .map((c) => (
                    <li key={c.path}>
                      <A to={c.path}>{c.name}</A>
                    </li>
                  ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
      <Section id="words" title="Words you'll meet">
        <dl className="glossary">
          {Object.values(GLOSSARY).map((entry) => (
            <div key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>
                {entry.definition} More in <A to={entry.learn}>{PAGES.find((p) => p.path === entry.learn)?.name}</A>.
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

export const PAGES: Page[] = [
  {
    path: "learn/",
    name: "Learn",
    title: "Learn the Bloch Sphere: Qubits and Gates, Step by Step",
    heading: "Learn the Bloch sphere",
    description: "Beginner guides to qubits, the Bloch sphere, measurement and quantum gates, each with pictures and a live 3D sphere to try it on.",
    Body: Hub,
  },
  {
    path: "learn/qubit/",
    name: "What is a qubit?",
    title: "What Is a Qubit? A Beginner's Guide with Pictures",
    heading: "What is a qubit?",
    description: "A qubit in plain words: how it differs from a bit, what amplitudes, superposition and phase mean, and why its state is an arrow on a sphere.",
    Body: Qubit,
  },
  {
    path: "learn/bloch-sphere/",
    name: "The Bloch sphere",
    title: "What Is the Bloch Sphere? A Visual Guide to Qubit States",
    heading: "What is the Bloch sphere?",
    description: "How the Bloch sphere pictures a qubit: θ and φ, the Bloch vector (x, y, z), why |0⟩ and |1⟩ are opposite, and what global phase is.",
    Body: BlochSphere,
  },
  {
    path: "learn/key-states/",
    name: "The six key states",
    title: "The Six Key Qubit States: |0⟩, |1⟩, |+⟩, |−⟩, |+i⟩, |−i⟩",
    heading: "The six key states",
    description: "The six states where the axes meet the Bloch sphere: their kets, coordinates and odds, and the Z, X and Y bases they make.",
    Body: KeyStates,
  },
  {
    path: "learn/measurement/",
    name: "Measuring a qubit",
    title: "Measuring a Qubit: Probabilities on the Bloch Sphere",
    heading: "Measuring a qubit",
    description: "Why measuring a qubit gives 0 or 1 at random, how to read the odds from the arrow's height, and what happens to the state afterward.",
    Body: Measurement,
  },
  {
    path: "learn/gates/",
    name: "Gates",
    title: "Quantum Gates as Rotations of the Bloch Sphere",
    heading: "Gates are rotations",
    description: "Every one-qubit gate turns the Bloch sphere about an axis by an angle. Matrices, the right-hand rule, global phase, and why order matters.",
    Body: Gates,
  },
  {
    path: "learn/gates/pauli-x/",
    name: "Pauli-X",
    title: "Pauli-X Gate (Quantum NOT) on the Bloch Sphere",
    heading: "The Pauli-X gate",
    description: "The Pauli-X gate, the quantum NOT: its matrix, its half turn about the x axis, and what it does to |0⟩, |1⟩, |+⟩ and the other key states.",
    Body: PauliX,
  },
  {
    path: "learn/gates/pauli-y/",
    name: "Pauli-Y",
    title: "Pauli-Y Gate on the Bloch Sphere: Matrix and Rotation",
    heading: "The Pauli-Y gate",
    description: "The Pauli-Y gate: its matrix, its half turn about the y axis, the phases it adds, and how it differs from Pauli-X on the key states.",
    Body: PauliY,
  },
  {
    path: "learn/gates/pauli-z/",
    name: "Pauli-Z",
    title: "Pauli-Z Gate (Phase Flip) on the Bloch Sphere",
    heading: "The Pauli-Z gate",
    description: "The Pauli-Z gate, the phase flip: its matrix, its half turn about the z axis, and why it changes |+⟩ to |−⟩ but never the odds of 0 or 1.",
    Body: PauliZ,
  },
  {
    path: "learn/gates/hadamard/",
    name: "Hadamard",
    title: "Hadamard Gate on the Bloch Sphere: Matrix and Rotation",
    heading: "The Hadamard gate",
    description: "The Hadamard gate: why it's a half turn about the x–z diagonal (not a quarter turn), its matrix, and how it switches the Z and X bases.",
    Body: Hadamard,
  },
  {
    path: "learn/gates/s-and-t/",
    name: "S and T",
    title: "S and T Gates on the Bloch Sphere: Phase Rotations",
    heading: "The S and T gates",
    description: "The S and T phase gates: quarter and eighth turns about z, their matrices, why T is called the π/8 gate, and S† and T†.",
    Body: SAndT,
  },
  {
    path: "learn/gates/rotation-gates/",
    name: "Rotation gates",
    title: "Rotation Gates Rx, Ry, Rz on the Bloch Sphere",
    heading: "Rotation gates: Rx, Ry and Rz",
    description: "Rotation gates Rx(θ), Ry(θ) and Rz(θ): their matrices, why they use half angles, and how Pauli, S and T gates are rotations too.",
    Body: RotationGates,
  },
  {
    path: "learn/gate-lab/",
    name: "The Gate Lab",
    title: "Build Your Own Quantum Gates in the Gate Lab",
    heading: "Build your own gates",
    description: "Combine gates in the Gate Lab and see the single rotation they add up to: H·T·H, H·Z·H = X, square roots, inverses and more.",
    Body: GateLab,
  },
];
