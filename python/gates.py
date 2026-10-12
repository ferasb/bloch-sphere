"""Single-qubit gates as 2x2 unitaries, the reference for web/src/math/gate.ts."""

from typing import ClassVar

import numpy as np

from qubit import Qubit


class Gate:
    """A 2x2 unitary matrix, with an optional name."""

    I: ClassVar["Gate"]
    X: ClassVar["Gate"]
    Y: ClassVar["Gate"]
    Z: ClassVar["Gate"]
    H: ClassVar["Gate"]
    S: ClassVar["Gate"]
    T: ClassVar["Gate"]
    S_DAG: ClassVar["Gate"]
    T_DAG: ClassVar["Gate"]

    def __init__(self, matrix: np.array, name=None):
        matrix = np.asarray(matrix, dtype=complex)
        if matrix.shape != (2, 2):
            raise ValueError("Matrix should be of dimensions 2x2")

        if not np.allclose(matrix.conj().T @ matrix, np.eye(2)):
            raise ValueError("Matrix must be unitary")
        self.matrix = matrix
        self.name = name

    def apply(self, qu: Qubit):
        vec = qu.state_vector()
        res = self.matrix @ vec
        return Qubit(res[0], res[1])

    @staticmethod
    def mult(a: "Gate", b: "Gate"):
        mat = a.matrix @ b.matrix
        name = f"{a.name or 'U'} * {b.name or 'U'}"
        return Gate(mat, name)

    def __matmul__(self, other: "Gate"):
        if not isinstance(other, Gate):
            return NotImplemented
        return Gate.mult(self, other)

    @staticmethod
    def rotation(axis, angle: float, name=None):
        """R_n(angle) = cos(angle/2) I - i sin(angle/2) (nx X + ny Y + nz Z), about the unit vector axis."""
        nx, ny, nz = axis
        c, s = np.cos(angle / 2), np.sin(angle / 2)
        return Gate(
            np.array([[c - 1j * s * nz, -s * ny - 1j * s * nx], [s * ny - 1j * s * nx, c + 1j * s * nz]]),
            name,
        )

    def decompose(self):
        """The gate as phase * R_axis(angle): returns (phase, axis, angle) with angle in [0, pi].

        Dividing by sqrt(det) removes the global phase; of the two roots, the one with Re(u00) >= 0
        turns the short way. For a half turn both are equally short, so the axis is made to point
        forward (first nonzero component positive), which keeps X ** 0.5 equal to sqrt(X).
        """
        (u00, u01), (u10, u11) = self.matrix
        phase = np.sqrt(complex(u00 * u11 - u01 * u10))
        a, b = u00 / phase, u01 / phase
        sn = np.array([-b.imag, -b.real, -a.imag])
        nonzero = sn[np.abs(sn) > 1e-12]
        backward = nonzero.size > 0 and nonzero[0] < 0
        if a.real < -1e-12 or (abs(a.real) <= 1e-12 and backward):
            a, b, phase = -a, -b, -phase
            sn = np.array([-b.imag, -b.real, -a.imag])
        s = np.linalg.norm(sn)
        angle = 2 * np.arctan2(s, a.real)
        axis = np.array([0.0, 0.0, 1.0]) if s < 1e-12 else sn / s
        return phase, axis, angle

    def axis_angle(self):
        _, axis, angle = self.decompose()
        return axis, angle

    def adjoint(self):
        """U-dagger: the gate that undoes this one."""
        name = None if self.name is None else (self.name[:-1] if self.name.endswith("†") else self.name + "†")
        return Gate(self.matrix.conj().T, name)

    def power(self, t: float, name=None):
        """U ** t: t times the rotation about the same axis, with the phase raised to t too."""
        phase, axis, angle = self.decompose()
        return Gate(np.exp(1j * t * np.angle(phase)) * Gate.rotation(axis, t * angle).matrix, name)

    def phase_to(self, other: "Gate", tol=1e-9):
        """The global phase e^(i beta) with other = e^(i beta) * self, or None if they're different gates."""
        overlap = np.trace(self.matrix.conj().T @ other.matrix) / 2
        return overlap if abs(abs(overlap) - 1) < tol else None

    def equals_up_to_phase(self, other: "Gate", tol=1e-9):
        return self.phase_to(other, tol) is not None

    @staticmethod
    def R_X(theta: float):
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return Gate(np.array([[c, -1j * s], [-1j * s, c]]), f"R_X({theta:.3f})")

    @staticmethod
    def R_Y(theta: float):
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return Gate(np.array([[c, -s], [s, c]]), f"R_Y({theta:.3f})")

    @staticmethod
    def R_Z(theta: float):
        return Gate(
            np.array([[np.exp(-1j * theta / 2), 0], [0, np.exp(1j * theta / 2)]]),
            f"R_Z({theta:.3f})",
        )

    def __str__(self):
        return f"Name = {self.name}, Gate = {self.matrix}"

    def __repr__(self):
        return f"Gate(Name = {self.name}, Gate = {self.matrix})"


Gate.I = Gate(np.array([[1, 0], [0, 1]]), "I")
Gate.X = Gate(np.array([[0, 1], [1, 0]]), "X")
Gate.Y = Gate(np.array([[0, -1j], [1j, 0]]), "Y")
Gate.Z = Gate(np.array([[1, 0], [0, -1]]), "Z")
Gate.H = Gate(np.array([[1, 1], [1, -1]]) / np.sqrt(2), "H")
Gate.S = Gate(np.array([[1, 0], [0, 1j]]), "S")
Gate.T = Gate(np.array([[1, 0], [0, np.exp(1j * np.pi / 4)]]), "T")
Gate.S_DAG = Gate(Gate.S.matrix.conj().T, "S_DAG")
Gate.T_DAG = Gate(Gate.T.matrix.conj().T, "T_DAG")
