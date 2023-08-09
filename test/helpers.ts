import assert from "node:assert/strict";
import type { Polygon, Vertex } from "../csg";

export function polygons(ps: Polygon[]): string {
    return ps
        .map(p => p.vertices.map(vertex).sort().join(" / "))
        .sort().join("\n");
}

export function assertPolygonsEqual(actual: Polygon[], expected: Polygon[]) {
    const actualStr = polygons(actual);
    const expectedStr = polygons(expected);
    assert.equal(actualStr, expectedStr);
}

function vertex(v: Vertex): string {
    const pos = v.pos.x + "," + v.pos.y + "," + v.pos.z;
    const norm = v.normal.x + "," + v.normal.y + "," + v.normal.z;
    return `p=${pos}&n=${norm}`
}