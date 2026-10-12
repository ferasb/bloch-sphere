import numpy as np
import pytest

from gates import Gate
from qubit import Qubit
from register import Register, swap_power


def zeros(n):
    return Register.product([Qubit.ZERO] * n)


def length(v):
    return float(np.linalg.norm(v))


def test_product_wire_zero_first():
    r = Register.product([Qubit.ONE, Qubit.ZERO])
    np.testing.assert_allclose(r.probabilities(), [0, 0, 1, 0], atol=1e-12)
    np.testing.assert_allclose(r.bloch(0), [0, 0, -1], atol=1e-12)


def test_bell_pair_arrows_vanish():
    bell = zeros(2).apply(Gate.H, 0).apply_controlled(Gate.X, 0, 1)
    np.testing.assert_allclose(bell.probabilities(), [0.5, 0, 0, 0.5], atol=1e-12)
    assert length(bell.bloch(0)) == pytest.approx(0, abs=1e-12)
    assert length(bell.bloch(1)) == pytest.approx(0, abs=1e-12)


def test_cnot_with_control_zero_does_nothing():
    np.testing.assert_allclose(zeros(2).apply_controlled(Gate.X, 0, 1).probabilities(), [1, 0, 0, 0], atol=1e-12)


def test_second_cnot_undoes_entanglement():
    r = zeros(2).apply(Gate.H, 0).apply_controlled(Gate.X, 0, 1).apply_controlled(Gate.X, 0, 1)
    assert length(r.bloch(0)) == pytest.approx(1)


def test_example_circuit_never_entangles():
    r = zeros(5).apply_controlled(Gate.X, 2, 1)
    for gate, wire in [(Gate.X, 1), (Gate.H, 2), (Gate.S, 3), (Gate.Y, 4), (Gate.T, 2), (Gate.Z, 3),
                       (Gate.T_DAG, 2), (Gate.Z, 3), (Gate.X, 1), (Gate.H, 2), (Gate.S_DAG, 3), (Gate.Y, 4)]:
        r = r.apply(gate, wire)
        for w in range(5):
            assert length(r.bloch(w)) == pytest.approx(1)
    r = r.apply_controlled(Gate.X, 2, 1)
    assert r.probabilities()[0] == pytest.approx(1)


def test_swap_and_half_swap():
    start = Register.product([Qubit.PLUS, Qubit.ONE, Qubit.MINUS_I])
    swapped = start.apply_two(swap_power(1), 0, 2)
    np.testing.assert_allclose(swapped.bloch(0), Qubit.MINUS_I.to_bloch_vector(), atol=1e-10)
    halves = start.apply_two(swap_power(0.5), 0, 2).apply_two(swap_power(0.5), 0, 2)
    np.testing.assert_allclose(halves.amplitudes, swapped.amplitudes, atol=1e-10)


def test_measurement_collapses_the_partner_too():
    bell = zeros(2).apply(Gate.H, 0).apply_controlled(Gate.X, 0, 1)
    one = bell.collapse(0, 1)
    np.testing.assert_allclose(one.bloch(1), [0, 0, -1], atol=1e-12)
    with pytest.raises(ValueError):
        zeros(1).collapse(0, 1)


def test_fractional_cnot_shrinks_smoothly():
    start = zeros(2).apply(Gate.H, 0)
    lengths = [length(start.apply_controlled(Gate.X.power(t), 0, 1).bloch(0)) for t in [0, 0.25, 0.5, 0.75, 1]]
    assert lengths[0] == pytest.approx(1) and lengths[-1] == pytest.approx(0, abs=1e-10)
    assert all(b < a for a, b in zip(lengths, lengths[1:]))
