import test from "node:test";
import assert from "node:assert/strict";
import { cube } from "../csg";
import { assertPolygonsEqual } from "./helpers";

test("Intersection of non-overlapping cubes", function() {
    const a = cube({
        center: [1, 1, 1],
        radius: 1,
    });
    const b = cube({
        center: [10, 10, 10],
        radius: 1,
    });
    const u = a.intersect(b);
    assert.equal(u.polygons.length, 0);
});

test("Intersection of corner-overlapping cubes", function() {
    const a = cube({
        center: [1, 1, 1],
        radius: 1,
    });
    const b = cube({
        center: [1.5, 1.5, 1.5],
        radius: 1,
    });
    const u = a.intersect(b);
    assert.equal(u.polygons.length, 6);
});

test("Intersection of incident cubes", function() {
    const a = cube({
        center: [1, 1, 1],
        radius: 1,
    });
    const b = cube({
        center: [1, 1, 1],
        radius: 1,
    });
    const u = a.intersect(b);
    assert.equal(u.polygons.length, 6);
    assertPolygonsEqual(u.polygons, a.polygons);
});
