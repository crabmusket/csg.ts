import assert from "node:assert/strict";
import test from "node:test";
import { Plane, Polygon, Vector, Vertex } from "../csg";

test("Plane.splitPolygon all in front", function() {
    // Vertical YZ plane through the origin
    const plane = Plane.fromPoints(
        new Vector(0, 0, 0),
        new Vector(0, 1, 0),
        new Vector(0, 0, 1),
    );

    // Polygon in the +x hemisphere
    const poly = new Polygon([
        new Vertex([1, 0, 0], [1, 0, 0]),
        new Vertex([1, 1, 0], [1, 0, 0]),
        new Vertex([1, 0, 1], [1, 0, 0]),
    ]);

    const cpf: Polygon[] = [];
    const cpb: Polygon[] = [];
    const front: Polygon[] = [];
    const back: Polygon[] = [];
    plane.splitPolygon(poly, cpf, cpb, front, back);
    assert.equal(0, cpf.length);
    assert.equal(0, cpb.length);
    assert.equal(1, front.length);
    assert.equal(0, back.length);
});

test("Plane.splitPolygon all behind", function() {
    // Vertical YZ plane through the origin
    const plane = Plane.fromPoints(
        new Vector(0, 0, 0),
        new Vector(0, 1, 0),
        new Vector(0, 0, 1),
    );

    // Polygon in the -x hemisphere
    const poly = new Polygon([
        new Vertex([-1, 0, 0], [1, 0, 0]),
        new Vertex([-1, 1, 0], [1, 0, 0]),
        new Vertex([-1, 0, 1], [1, 0, 0]),
    ]);

    const cpf: Polygon[] = [];
    const cpb: Polygon[] = [];
    const front: Polygon[] = [];
    const back: Polygon[] = [];
    plane.splitPolygon(poly, cpf, cpb, front, back);
    assert.equal(0, cpf.length);
    assert.equal(0, cpb.length);
    assert.equal(0, front.length);
    assert.equal(1, back.length);
});

test("Plane.splitPolygon down the middle", function() {
    // Vertical YZ plane through the origin
    const plane = Plane.fromPoints(
        new Vector(0, 0, 0),
        new Vector(0, 1, 0),
        new Vector(0, 0, 1),
    );

    // Polygon describing a square on the XY plane with radius 2
    const poly = new Polygon([
        new Vertex([-1, 1, 0], [0, 0, 1]),
        new Vertex([-1, -1, 0], [0, 0, 1]),
        new Vertex([1, -1, 0], [0, 0, 1]),
        new Vertex([1, 1, 0], [0, 0, 1]),
    ]);

    const cpf: Polygon[] = [];
    const cpb: Polygon[] = [];
    const front: Polygon[] = [];
    const back: Polygon[] = [];
    plane.splitPolygon(poly, cpf, cpb, front, back);
    assert.equal(0, cpf.length);
    assert.equal(0, cpb.length);
    assert.equal(1, front.length);
    assert.equal(1, back.length);

    for (let v of front[0].vertices) {
        assert.ok(v.pos.x >= 0, "All front vertices must have x >= 0");
    }
    for (let v of back[0].vertices) {
        assert.ok(v.pos.x <= 0, "All back vertices must have x <= 0");
    }
});
