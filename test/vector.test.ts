import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector} from '../csg';

test("Vector.length", function() {
    assert.equal(0, new Vector(0, 0, 0).length());
    assert.equal(1, new Vector(1, 0, 0).length());
});
