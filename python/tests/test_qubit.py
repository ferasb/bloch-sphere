import numpy as np
import pytest

from qubit import Qubit

INV_SQRT2 = 1 / np.sqrt(2)


def assert_phi_close(actual, expected):
    """Compare angles on the circle so 0 ≡ 2π and −π/2 ≡ 3π/2."""
    np.testing.assert_allclose(np.cos(actual), np.cos(expected), atol=1e-10)
    np.testing.assert_allclose(np.sin(actual), np.sin(expected), atol=1e-10)


def assert_qubit_matches(q, vector, theta, phi=None):
    np.testing.assert_allclose(q.to_bloch_vector(), vector, atol=1e-10)
    actual_theta, actual_phi = q.to_bloch_angles()
    assert actual_theta == pytest.approx(theta)
    if phi is not None:
        assert_phi_close(actual_phi, phi)


@pytest.mark.parametrize(
    "a, b, vector, theta, phi",
    [
        (1, 0, (0, 0, 1), 0, None),
        (0, 1, (0, 0, -1), np.pi, None),
        (INV_SQRT2, INV_SQRT2, (1, 0, 0), np.pi / 2, 0),
        (INV_SQRT2, -INV_SQRT2, (-1, 0, 0), np.pi / 2, np.pi),
        (INV_SQRT2, 1j * INV_SQRT2, (0, 1, 0), np.pi / 2, np.pi / 2),
        (INV_SQRT2, -1j * INV_SQRT2, (0, -1, 0), np.pi / 2, 3 * np.pi / 2),
    ],
)
def test_basis_states(a, b, vector, theta, phi):
    assert_qubit_matches(Qubit(a, b), vector, theta, phi)


@pytest.mark.parametrize(
    "a, b, vector, theta, phi",
    [
        (
            np.cos(np.pi / 8),
            np.sin(np.pi / 8),
            (np.sqrt(2) / 2, 0, np.sqrt(2) / 2),
            np.pi / 4,
            0,
        ),
        (
            np.sqrt(3) / 2,
            0.5 * np.exp(1j * np.pi / 4),
            (np.sqrt(6) / 4, np.sqrt(6) / 4, 0.5),
            np.pi / 3,
            np.pi / 4,
        ),
    ],
)
def test_off_axis_states(a, b, vector, theta, phi):
    assert_qubit_matches(Qubit(a, b), vector, theta, phi)


@pytest.mark.parametrize(
    "a, b, vector, theta, phi",
    [
        (1, 1, (1, 0, 0), np.pi / 2, 0),
        (3, 4, (0.96, 0, -0.28), 1.8545904360032246, 0),
    ],
)
def test_normalization(a, b, vector, theta, phi):
    assert_qubit_matches(Qubit(a, b), vector, theta, phi)


@pytest.mark.parametrize(
    "a, b, vector, theta, phi",
    [
        (1j, 0, (0, 0, 1), 0, None),
        (-1, 0, (0, 0, 1), 0, None),
        (1j * INV_SQRT2, -INV_SQRT2, (0, 1, 0), np.pi / 2, np.pi / 2),
        (-INV_SQRT2, 1j * INV_SQRT2, (0, -1, 0), np.pi / 2, 3 * np.pi / 2),
    ],
)
def test_global_phase(a, b, vector, theta, phi):
    assert_qubit_matches(Qubit(a, b), vector, theta, phi)


def test_zero_amplitudes_raise():
    with pytest.raises(ValueError):
        Qubit(0, 0)


def test_integer_input_matches_complex():
    as_ints = Qubit(1, 0)
    as_complex = Qubit(1 + 0j, 0 + 0j)
    np.testing.assert_allclose(
        as_ints.to_bloch_vector(), as_complex.to_bloch_vector(), atol=1e-10
    )
    np.testing.assert_allclose(
        as_ints.to_bloch_angles(), as_complex.to_bloch_angles(), atol=1e-10
    )


@pytest.mark.parametrize("n_samples", [300])
def test_random_state_properties(n_samples):
    rng = np.random.default_rng(0)
    for _ in range(n_samples):
        a = rng.normal() + 1j * rng.normal()
        b = rng.normal() + 1j * rng.normal()
        if abs(a) ** 2 + abs(b) ** 2 < 1e-30:
            continue
        q = Qubit(a, b)
        vector = np.asarray(q.to_bloch_vector(), dtype=float)
        theta, phi = q.to_bloch_angles()

        assert not np.isnan(vector).any()
        assert not np.isnan(theta)
        assert not np.isnan(phi)
        assert np.linalg.norm(vector) == pytest.approx(1)

        from_angles = np.array(
            [
                np.sin(theta) * np.cos(phi),
                np.sin(theta) * np.sin(phi),
                np.cos(theta),
            ]
        )
        np.testing.assert_allclose(vector, from_angles, atol=1e-10)


@pytest.mark.parametrize(
    "theta, phi, vector",
    [
        (0, 0, (0, 0, 1)),
        (np.pi, 0, (0, 0, -1)),
        (np.pi / 2, 0, (1, 0, 0)),
        (np.pi / 2, np.pi, (-1, 0, 0)),
        (np.pi / 2, np.pi / 2, (0, 1, 0)),
        (np.pi / 2, 3 * np.pi / 2, (0, -1, 0)),
        (np.pi / 4, 0, (np.sqrt(2) / 2, 0, np.sqrt(2) / 2)),
        (np.pi / 3, np.pi / 4, (np.sqrt(6) / 4, np.sqrt(6) / 4, 0.5)),
    ],
)
def test_from_bloch_angles(theta, phi, vector):
    check_phi = not np.isclose(np.sin(theta), 0)
    assert_qubit_matches(
        Qubit.from_bloch_angles(theta, phi),
        vector,
        theta,
        phi if check_phi else None,
    )


@pytest.mark.parametrize(
    "vector, theta, phi",
    [
        ((0, 0, 1), 0, None),
        ((0, 0, -1), np.pi, None),
        ((1, 0, 0), np.pi / 2, 0),
        ((-1, 0, 0), np.pi / 2, np.pi),
        ((0, 1, 0), np.pi / 2, np.pi / 2),
        ((0, -1, 0), np.pi / 2, 3 * np.pi / 2),
        ((np.sqrt(2) / 2, 0, np.sqrt(2) / 2), np.pi / 4, 0),
        ((np.sqrt(6) / 4, np.sqrt(6) / 4, 0.5), np.pi / 3, np.pi / 4),
    ],
)
def test_from_bloch_vector(vector, theta, phi):
    assert_qubit_matches(Qubit.from_bloch_vector(*vector), vector, theta, phi)


def test_from_bloch_vector_rejects_unnormalized():
    with pytest.raises(ValueError):
        Qubit.from_bloch_vector(2, 0, 0)


def test_from_bloch_vector_zero_raises():
    with pytest.raises(ValueError):
        Qubit.from_bloch_vector(0, 0, 0)


def test_from_bloch_angles_and_vector_agree():
    theta, phi = np.pi / 3, np.pi / 4
    from_angles = Qubit.from_bloch_angles(theta, phi)
    from_vector = Qubit.from_bloch_vector(*from_angles.to_bloch_vector())
    np.testing.assert_allclose(
        from_angles.to_bloch_vector(),
        from_vector.to_bloch_vector(),
        atol=1e-10,
    )


def test_from_bloch_angles_roundtrip_random():
    rng = np.random.default_rng(1)
    for _ in range(50):
        theta = rng.uniform(0, np.pi)
        phi: float = rng.uniform(0, 2 * np.pi)
        q = Qubit.from_bloch_angles(theta, phi)
        got_theta, got_phi = q.to_bloch_angles()
        assert got_theta == pytest.approx(theta)
        if not np.isclose(np.sin(theta), 0):
            assert_phi_close(got_phi, phi)
        np.testing.assert_allclose(np.linalg.norm(q.to_bloch_vector()), 1, atol=1e-10)


def test_from_bloch_vector_roundtrip_random():
    rng = np.random.default_rng(2)
    for _ in range(50):
        vec = rng.normal(size=3)
        vec = vec / np.linalg.norm(vec)
        q = Qubit.from_bloch_vector(*vec)
        np.testing.assert_allclose(q.to_bloch_vector(), vec, atol=1e-10)

def test_fidelity():
    np.testing.assert_allclose(Qubit.fidelity(Qubit.ZERO, Qubit.ONE), 0, atol=1e-10)
    np.testing.assert_allclose(Qubit.fidelity(Qubit.ZERO, Qubit.PLUS), 1/2, atol=1e-10)
    np.testing.assert_allclose(Qubit.fidelity(Qubit.ZERO, Qubit.MINUS), 1/2, atol=1e-10)


@pytest.mark.parametrize(
    "q1, q2, expected",
    [
        (Qubit.ZERO, Qubit.ZERO, True),
        (Qubit.ZERO, Qubit(1j, 0), True),
        (Qubit.PLUS, Qubit(-INV_SQRT2, -INV_SQRT2), True),
        (Qubit.ZERO, Qubit.ONE, False),
        (Qubit.ZERO, Qubit.PLUS, False),
        (Qubit.PLUS, Qubit.MINUS, False),
    ],
)
def test_is_equivalent(q1, q2, expected):
    assert q1.is_equivalent(q2) is expected
