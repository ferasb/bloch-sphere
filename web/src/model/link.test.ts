import { describe, expect, it } from "vitest";
import { Qubit } from "../math/qubit";
import { linkHash, parseLink, type Link } from "./link";

describe("parseLink", () => {
  it("reads starting states and gates for the Sphere room", () => {
    const link = parseLink("#/?start=0,+i,-&gates=H,Sdg,Rx(90)");
    expect(link?.room).toBe("sphere");
    if (link?.room === "sphere") {
      expect(link.start.map((q) => q.blochVector().map(Math.round))).toEqual([
        [0, 0, 1],
        [0, 1, 0],
        [-1, 0, 0],
      ]);
      expect(link.gates).toEqual([{ name: "H" }, { name: "S†" }, { name: "Rx", angle: Math.PI / 2 }]);
    }
  });

  it("reads a state given by its angles", () => {
    const link = parseLink("#/?start=90:45");
    expect(link?.room === "sphere" && link.start[0].isEquivalent(Qubit.fromBlochAngles(Math.PI / 2, Math.PI / 4))).toBe(true);
  });

  it("starts at |0⟩ with no gates when only the room is given", () => {
    expect(parseLink("#/?gates=X")).toEqual({ room: "sphere", start: [Qubit.ZERO], gates: [{ name: "X" }] });
  });

  it("accepts S† written out, percent-encoded, and a typographic minus", () => {
    const link = parseLink("#/?start=%E2%88%92i&gates=S%E2%80%A0");
    expect(link?.room === "sphere" && link.start[0].isEquivalent(Qubit.MINUS_I)).toBe(true);
    expect(link?.gates).toEqual([{ name: "S†" }]);
  });

  it("reads Gate Lab links", () => {
    const link = parseLink("#/lab?gates=H,T,H&start=+");
    expect(link?.room).toBe("lab");
    expect(link?.gates).toEqual([{ name: "H" }, { name: "T" }, { name: "H" }]);
    expect(link?.room === "lab" && link.start.isEquivalent(Qubit.PLUS)).toBe(true);
  });

  it.each([
    ["no link", "#/"],
    ["the lab without a query", "#/lab"],
    ["an unknown parameter", "#/?start=0&color=red"],
    ["a repeated parameter", "#/?gates=X&gates=Y"],
    ["an unknown state", "#/?start=2"],
    ["θ past 180°", "#/?start=200:0"],
    ["φ of 360° or more", "#/?start=90:360"],
    ["an unknown gate", "#/?gates=CNOT"],
    ["a huge angle", "#/?gates=Rx(100000)"],
    ["six qubits", "#/?start=0,0,0,0,0,0"],
    ["two lab test states", "#/lab?start=0,1"],
    ["a lab test state off the axes", "#/lab?start=60:45"],
    ["too many gates", `#/?gates=${Array(25).fill("X").join(",")}`],
    ["broken percent-encoding", "#/?gates=%E2%80"],
  ])("rejects %s", (_, hash) => {
    expect(parseLink(hash)).toBeNull();
  });
});

describe("linkHash", () => {
  it("writes links people can read", () => {
    const link: Link = { room: "sphere", start: [Qubit.ZERO, Qubit.MINUS_I], gates: [{ name: "H" }, { name: "T†" }, { name: "Rz", angle: -Math.PI / 4 }] };
    expect(linkHash(link)).toBe("#/?start=0,-i&gates=H,Tdg,Rz(-45)");
  });

  it("writes other states by their angles, and round-trips", () => {
    const link: Link = { room: "sphere", start: [Qubit.fromBlochAngles(Math.PI / 3, Math.PI / 4)], gates: [{ name: "S" }] };
    const hash = linkHash(link);
    expect(hash).toBe("#/?start=60:45&gates=S");
    const back = parseLink(hash);
    expect(back?.room === "sphere" && back.start[0].isEquivalent(link.start[0])).toBe(true);
  });

  it("writes Gate Lab links", () => {
    expect(linkHash({ room: "lab", start: Qubit.PLUS, gates: [{ name: "H" }, { name: "T" }, { name: "H" }] })).toBe("#/lab?start=+&gates=H,T,H");
  });
});
