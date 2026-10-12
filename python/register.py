"""An n-qubit register (n <= 5) as 2^n amplitudes, the reference for web/src/math/register.ts."""

import numpy as np

MAX_REGISTER = 5


class Register:
    """n qubits (n <= 5) as one state of 2**n amplitudes; unlike separate Qubits it can be entangled.

    Wire i is bit (n - 1 - i) of an amplitude's index, so a basis state's bits read wire 0, wire 1,
    ... from left to right (the same convention as the web app's Register).
    """

    def __init__(self, n, amplitudes):
        self.n = n
        self.amplitudes = np.asarray(amplitudes, dtype=complex)

    @staticmethod
    def product(states):
        """The unentangled state where wire i is states[i]."""
        if not 1 <= len(states) <= MAX_REGISTER:
            raise ValueError(f"A register holds 1 to {MAX_REGISTER} qubits")
        amps = np.array([1], dtype=complex)
        for q in states:
            amps = np.kron(amps, q.state_vector())
        return Register(len(states), amps)

    def _tensor(self):
        return self.amplitudes.reshape([2] * self.n)

    def _check(self, wire):
        if not 0 <= wire < self.n:
            raise ValueError(f"No wire {wire}")

    def apply(self, gate, wire):
        """A single-qubit gate on one wire."""
        self._check(wire)
        t = np.moveaxis(np.tensordot(gate.matrix, self._tensor(), axes=([1], [wire])), 0, wire)
        return Register(self.n, t.reshape(-1))

    def apply_controlled(self, gate, control, target):
        """The gate on target, only where control is 1: CNOT is apply_controlled(Gate.X, ...)."""
        self._check(control)
        self._check(target)
        if control == target:
            raise ValueError("Control and target must be different wires")
        t = self._tensor().copy()
        index = [slice(None)] * self.n
        index[control] = 1
        sub = t[tuple(index)]
        axis = target if target < control else target - 1
        sub = np.moveaxis(np.tensordot(gate.matrix, sub, axes=([1], [axis])), 0, axis)
        t[tuple(index)] = sub
        return Register(self.n, t.reshape(-1))

    def apply_two(self, matrix, a, b):
        """A two-qubit gate on wires a and b, as a 4x4 matrix in the basis |00>, |01>, |10>, |11> (a's bit first)."""
        self._check(a)
        self._check(b)
        if a == b:
            raise ValueError("Two different wires are needed")
        t = np.moveaxis(self._tensor(), [a, b], [0, 1])
        shape = t.shape
        t = (np.asarray(matrix, dtype=complex) @ t.reshape(4, -1)).reshape(shape)
        return Register(self.n, np.moveaxis(t, [0, 1], [a, b]).reshape(-1))

    def probabilities(self):
        return np.abs(self.amplitudes) ** 2

    def probability_of_one(self, wire):
        self._check(wire)
        return float(np.sum(np.abs(np.take(self._tensor(), 1, axis=wire)) ** 2))

    def collapse(self, wire, outcome):
        """The state after measuring wire and getting outcome (0 or 1)."""
        p = self.probability_of_one(wire) if outcome == 1 else 1 - self.probability_of_one(wire)
        if p < 1e-12:
            raise ValueError(f"Measuring wire {wire} can't give {outcome}")
        t = self._tensor().copy()
        index = [slice(None)] * self.n
        index[wire] = 1 - outcome
        t[tuple(index)] = 0
        return Register(self.n, t.reshape(-1) / np.sqrt(p))

    def bloch(self, wire):
        """The wire's own Bloch vector, from its reduced state: length 1 if unentangled, shorter if entangled."""
        self._check(wire)
        m = np.moveaxis(self._tensor(), wire, 0).reshape(2, -1)
        s = np.vdot(m[0], m[1])
        return np.array([2 * s.real, 2 * s.imag, np.vdot(m[0], m[0]).real - np.vdot(m[1], m[1]).real])


def swap_power(t):
    """SWAP ** t: swaps two wires (t = 1), or partway."""
    e = np.exp(1j * np.pi * t)
    plus, minus = (1 + e) / 2, (1 - e) / 2
    return np.array([[1, 0, 0, 0], [0, plus, minus, 0], [0, minus, plus, 0], [0, 0, 0, 1]], dtype=complex)
