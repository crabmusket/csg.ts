import test from "node:test";
import assert from "node:assert/strict";
import { Vector } from "../csg";

test("Vector.length", function() {
    assert.equal(new Vector(0, 0, 0).length(), 0);
    assert.equal(new Vector(1, 0, 0).length(), 1);
});
