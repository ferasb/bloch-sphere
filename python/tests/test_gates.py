import numpy as np
import pytest

from gates import Gate
from qubit import Qubit

INV_SQRT2 = 1 / np.sqrt(2)


def assert_qubits_matches(q1, q2):
    assert(q1.is_equivalent(q2))

def assert_phi_close(actual, expected):
    """Compare angles on the circle so 0 ≡ 2π and −π/2 ≡ 3π/2."""
    np.testing.assert_allclose(np.cos(actual), np.cos(expected), atol=1e-10)
    np.testing.assert_allclose(np.sin(actual), np.sin(expected), atol=1e-10)

STATES = {
    "0": Qubit.ZERO,
    "1": Qubit.ONE,
    "+": Qubit.PLUS,
    "-": Qubit.MINUS,
    "+i": Qubit.PLUS_I,
    "-i": Qubit.MINUS_I,
}

# Rows are gates, columns are input states: |0>, |1>, |+>, |->, |+i>, |-i>
GATE_TABLE = {
    "X": (Gate.X, ["1", "0", "+", "-", "-i", "+i"]),
    "Y": (Gate.Y, ["1", "0", "-", "+", "+i", "-i"]),
    "Z": (Gate.Z, ["0", "1", "-", "+", "-i", "+i"]),
    "H": (Gate.H, ["+", "-", "0", "1", "-i", "+i"]),
    "S": (Gate.S, ["0", "1", "+i", "-i", "-", "+"]),
    "S_DAG": (Gate.S_DAG, ["0", "1", "-i", "+i", "+", "-"]),
}

INPUTS = ["0", "1", "+", "-", "+i", "-i"]


@pytest.mark.parametrize(
    "gate, input_state, expected_state",
    [
        pytest.param(gate, inp, out, id=f"{name}|{inp}>")
        for name, (gate, outputs) in GATE_TABLE.items()
        for inp, out in zip(INPUTS, outputs)
    ],
)
def test_gate_state_table(gate, input_state, expected_state):
    assert_qubits_matches(gate.apply(STATES[input_state]), STATES[expected_state])


def test_matmul_matches_mult():
    np.testing.assert_allclose((Gate.H @ Gate.T).matrix, Gate.mult(Gate.H, Gate.T).matrix)


def test_matmul_applies_right_gate_first():
    # H·X|0> = |->, while X·H|0> = |+>
    assert_qubits_matches((Gate.H @ Gate.X).apply(Qubit.ZERO), Qubit.MINUS)


def test_mult_names():
    assert (Gate.H @ Gate.T).name == "H * T"
    assert (Gate.H @ Gate(np.eye(2))).name == "H * U"


SQRT_X = Gate(0.5 * np.array([[1 + 1j, 1 - 1j], [1 - 1j, 1 + 1j]]), "√X")


def assert_same_matrix(actual, expected):
    np.testing.assert_allclose(actual.matrix, expected.matrix, atol=1e-10)


def test_decompose_rebuilds_the_gate():
    rng = np.random.default_rng(5)
    for _ in range(200):
        gate = Gate.R_Z(rng.uniform(0, 7)) @ Gate.R_Y(rng.uniform(0, 7)) @ Gate.R_Z(rng.uniform(0, 7))
        phase, axis, angle = gate.decompose()
        assert abs(phase) == pytest.approx(1)
        assert angle <= np.pi + 1e-12
        np.testing.assert_allclose(phase * Gate.rotation(axis, angle).matrix, gate.matrix, atol=1e-10)


@pytest.mark.parametrize(
    "gate, axis, degrees",
    [
        (Gate.X, [1, 0, 0], 180),
        (Gate.H, [INV_SQRT2, 0, INV_SQRT2], 180),
        (Gate.T, [0, 0, 1], 45),
        (Gate.S_DAG, [0, 0, -1], 90),
    ],
)
def test_axis_angle_matches_the_web_app(gate, axis, degrees):
    got_axis, got_angle = gate.axis_angle()
    np.testing.assert_allclose(got_axis, axis, atol=1e-10)
    assert got_angle == pytest.approx(np.radians(degrees))


def test_adjoint_undoes_the_gate():
    for gate in [Gate.H, Gate.T, Gate.R_X(1.3), Gate.H @ Gate.S]:
        assert_same_matrix(gate @ gate.adjoint(), Gate.I)
    assert Gate.T.adjoint().name == "T†"


@pytest.mark.parametrize(
    "actual, expected",
    [
        (Gate.T.power(2), Gate.S),
        (Gate.S.power(2), Gate.Z),
        (Gate.T.power(8), Gate.I),
        (Gate.Z.power(0.5), Gate.S),
        (Gate.X.power(0.5), SQRT_X),
        (Gate.T.power(-1), Gate.T_DAG),
    ],
)
def test_power(actual, expected):
    assert_same_matrix(actual, expected)


def test_phase_to():
    assert (Gate.H @ Gate.Z @ Gate.H).equals_up_to_phase(Gate.X)
    assert Gate.R_Z(np.pi).phase_to(Gate.Z) == pytest.approx(1j)
    assert not (Gate.H @ Gate.S).equals_up_to_phase(Gate.S @ Gate.H)
