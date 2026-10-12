"""A single-qubit pure state, the reference for web/src/math/qubit.ts."""

import logging
from typing import ClassVar

import numpy as np

logger = logging.getLogger(__name__)


def _fmt_amp(z):
    z = complex(z)
    re, im = z.real, z.imag
    re_zero = abs(re) < 5e-4
    im_zero = abs(im) < 5e-4
    if re_zero and im_zero:
        return "0"
    if im_zero:
        return f"{re:.3f}"
    if re_zero:
        return f"{im:.3f}i"
    return f"{re:.3f}{im:+.3f}i"


class Qubit:
    """alpha|0> + beta|1>, normalized on construction."""

    ZERO: ClassVar["Qubit"]
    ONE: ClassVar["Qubit"]
    PLUS: ClassVar["Qubit"]
    MINUS: ClassVar["Qubit"]
    PLUS_I: ClassVar["Qubit"]
    MINUS_I: ClassVar["Qubit"]

    def __init__(self, a: complex, b: complex):
        if a == 0 and b == 0:
            raise ValueError("Qubit must have non-zero amplitudes")
        self.a = a
        self.b = b
        norm_squared = abs(a)**2 + abs(b)**2
        if abs(norm_squared - 1) > 1e-10:
            logger.warning("Qubit norm is %s, not 1; normalizing", norm_squared)
            self.a = self.a / np.sqrt(norm_squared)
            self.b = self.b / np.sqrt(norm_squared)

    @classmethod
    def from_bloch_angles(cls, theta, phi):
        return cls(
            np.cos(theta/2),
            np.sin(theta/2) * np.exp(1j * phi)
        )

    @classmethod
    def from_bloch_vector(cls, x, y, z):
        if z == -1:
            return cls(0, 1)
        norm_squared = x**2 + y**2 + z**2
        if abs(norm_squared - 1) > 1e-10:
            raise ValueError("Bloch vector must have norm 1")
        coef = 1 / np.sqrt(2 * (z + 1))
        return cls(
            coef * (1 + z),
            coef * (x + 1j * y)
        )

    def __str__(self):
        return f"({_fmt_amp(self.a)})|0⟩ + ({_fmt_amp(self.b)})|1⟩"

    def __repr__(self):
        return f"Qubit(α={_fmt_amp(self.a)} + β={_fmt_amp(self.b)})"

    def to_bloch_angles(self):
        return (
            2 * np.arctan2(abs(self.b), abs(self.a)),
            np.angle(self.b) - np.angle(self.a)
        )

    def to_bloch_vector(self):
        theta, phi = self.to_bloch_angles()
        return (
            np.sin(theta) * np.cos(phi),
            np.sin(theta) * np.sin(phi),
            np.cos(theta)
        )

    def probabilities(self):
        return (abs(self.a)**2, abs(self.b)**2)

    def state_vector(self):
        return np.array([self.a, self.b])

    def is_equivalent(self, other):
        """Same physical state, ignoring global phase."""
        return bool(np.isclose(self.fidelity(other), 1, atol=1e-10))

    def inner(self, other):
        """<self|other>"""
        return np.vdot(self.state_vector(), other.state_vector())

    def fidelity(self, other):
        return abs(self.inner(other))**2


Qubit.ZERO = Qubit(1, 0)
Qubit.ONE = Qubit(0, 1)
Qubit.PLUS = Qubit(1/np.sqrt(2), 1/np.sqrt(2))
Qubit.MINUS = Qubit(1/np.sqrt(2), -1/np.sqrt(2))
Qubit.PLUS_I = Qubit(1/np.sqrt(2), 1j/np.sqrt(2))
Qubit.MINUS_I = Qubit(1/np.sqrt(2), -1j/np.sqrt(2))
