import process from "node:process";
import assert from "node:assert/strict";
import test from "node:test";
import { cube, union } from "../csg2";
import fs from "node:fs";
import { solidToObj } from "./obj";

test("Union of corner-overlapping cubes", function() {
    const a = cube({
        center: [1, 1, 1],
        radius: 1,
    });
    const b = cube({
        center: [1.5, 1.5, 1.5],
        radius: 1,
    });
    const u = union(a, b);

    if (process.env.WRITE_OBJ) {
        fs.writeFileSync("./dist/test/Union of corner-overlapping cubes A.obj", solidToObj("A", a));
        fs.writeFileSync("./dist/test/Union of corner-overlapping cubes B.obj", solidToObj("B", b));
        fs.writeFileSync("./dist/test/Union of corner-overlapping cubes A+B.obj", solidToObj("A+B", u));
    }

    // Each cube goes from 6 to 12 polygons.
    assert.equal(u.polygons.length, 24);
});