// Constructive Solid Geometry (CSG) is a modeling technique that uses Boolean
// operations like union and intersection to combine 3D solids. This library
// implements CSG operations on meshes elegantly and concisely using BSP trees,
// and is meant to serve as an easily understandable implementation of the
// algorithm. All edge cases involving overlapping coplanar polygons in both
// solids are correctly handled.
// 
// Example usage:
// 
//     import * as CSG from "./csg";
//     const cube = CSG.cube();
//     const sphere = CSG.sphere({ radius: 1.3 });
//     const polygons = cube.subtract(sphere).toPolygons();
// 
// ## Implementation Details
// 
// All CSG operations are implemented in terms of two functions, `clipTo()` and
// `invert()`, which remove parts of a BSP tree inside another BSP tree and swap
// solid and empty space, respectively. To find the union of `a` and `b`, we
// want to remove everything in `a` inside `b` and everything in `b` inside `a`,
// then combine polygons from `a` and `b` into one solid:
// 
//     a.clipTo(b);
//     b.clipTo(a);
//     a.build(b.allPolygons());
// 
// The only tricky part is handling overlapping coplanar polygons in both trees.
// The code above keeps both copies, but we need to keep them in one tree and
// remove them in the other tree. To remove them from `b` we can clip the
// inverse of `b` against `a`. The code for union now looks like this:
// 
//     a.clipTo(b);
//     b.clipTo(a);
//     b.invert();
//     b.clipTo(a);
//     b.invert();
//     a.build(b.allPolygons());
// 
// Subtraction and intersection naturally follow from set operations. If
// union is `A | B`, subtraction is `A - B = ~(~A | B)` and intersection is
// `A & B = ~(~A | ~B)` where `~` is the complement operator.
// 
// ## License
// 
// Copyright (c) 2011 Evan Wallace (http://madebyevan.com/), under the MIT license.

// Changes to Evan's code
//
// - Port to TypeScript.
// - Syntactic and comment style changes.
// - Remove polymorphism in arguments, in favour of separate functions for different
//   argument types.
// - Remove methods in favour of free functions.
// - Add generic type S to world for typed shared data.
//
// Copyright (c) 2023 Daniel Buckmaster (https://crabmusket.net/), under the MIT license.

/**
 * Holds a binary space partition tree representing a 3D solid. Two solids can
 * be combined using the `union()`, `subtract()`, and `intersect()` methods.
 *
 * The type parameter S is the shared data that each polygon in the solid may carry.
 */
export class Solid<S = unknown> {
  polygons: Polygon<S>[] = [];

  /** Construct a solid from a list of `CSG.Polygon` instances. */
  static fromPolygons<T>(polygons: Polygon<T>[]): Solid<T> {
    const csg = new Solid<T>();
    csg.polygons = polygons;
    return csg;
  }

  clone(): Solid<S> {
    return Solid.fromPolygons(
      this.polygons.map(p => p.clone())
    );
  }

  toPolygons(): Polygon<S>[] {
    return this.polygons;
  }

  /**
   * Return a new solid with solid and empty space switched. This solid is
   * not modified.
   */
  inverse(): Solid<S> {
    const csg = this.clone();
    csg.polygons.map(function(p) { p.flip(); });
    return csg;
  }
}

/**
 * Return a new solid representing space in either A or B. Neither A
 * nor B are modified.
 * 
 *     union(A, B)
 * 
 *     +-------+            +-------+
 *     |       |            |       |
 *     |   A   |            |       |
 *     |    +--+----+   =   |       +----+
 *     +----+--+    |       +----+       |
 *          |   B   |            |       |
 *          |       |            |       |
 *          +-------+            +-------+
 */
export function union(A: Solid, B: Solid): Solid {
  const a = new Node(A.clone().polygons);
  const b = new Node(B.clone().polygons);
  a.clipTo(b);
  b.clipTo(a);
  b.invert();
  b.clipTo(a);
  b.invert();
  a.build(b.allPolygons());
  return Solid.fromPolygons(a.allPolygons());
}

/**
 * Return a new solid representing space in A but not in B. Neither A
 * nor B are modified.
 * 
 *     subtract(A, B)
 * 
 *     +-------+            +-------+
 *     |       |            |       |
 *     |   A   |            |       |
 *     |    +--+----+   =   |    +--+
 *     +----+--+    |       +----+
 *          |   B   |
 *          |       |
 *          +-------+
 */
export function subtract(A: Solid, B: Solid): Solid {
  const a = new Node(A.clone().polygons);
  const b = new Node(B.clone().polygons);
  a.invert();
  a.clipTo(b);
  b.clipTo(a);
  b.invert();
  b.clipTo(a);
  b.invert();
  a.build(b.allPolygons());
  a.invert();
  return Solid.fromPolygons(a.allPolygons());
}

/**
 * Return a new solid representing space both in A and in B. Neither
 * A nor B are modified.
 * 
 *     intersect(A, B)
 * 
 *     +-------+
 *     |       |
 *     |   A   |
 *     |    +--+----+   =   +--+
 *     +----+--+    |       +--+
 *          |   B   |
 *          |       |
 *          +-------+
 */
export function intersect(A: Solid, B: Solid): Solid {
  const a = new Node(A.clone().polygons);
  const b = new Node(B.clone().polygons);
  a.invert();
  b.clipTo(a);
  b.invert();
  a.clipTo(b);
  b.clipTo(a);
  a.build(b.allPolygons());
  a.invert();
  return Solid.fromPolygons(a.allPolygons());
}

/**
 * Construct an axis-aligned solid cuboid. Optional parameters are `center` and
 * `radius`, which default to `[0, 0, 0]` and `[1, 1, 1]`. The radius can be
 * specified using a single number or a list of three numbers, one for each axis.
 * 
 * Example code:
 * 
 *     const cube = CSG.cube({
 *       center: [0, 0, 0],
 *       radius: 1
 *     });
 */
export function cube(options: {
  center?: [number, number, number];
  radius?: number | [number, number, number];
}) {
  options = options || {};
  const c = new Vector(...options.center || [0, 0, 0]);
  const r = !options.radius ? [1, 1, 1] : (
    (options.radius as any).length
      ? (options.radius as [number, number, number])
      : [options.radius as number, options.radius as number, options.radius as number]
  );
  return Solid.fromPolygons([
    [[0, 4, 6, 2], [-1, 0, 0]],
    [[1, 3, 7, 5], [+1, 0, 0]],
    [[0, 1, 5, 4], [0, -1, 0]],
    [[2, 6, 7, 3], [0, +1, 0]],
    [[0, 2, 3, 1], [0, 0, -1]],
    [[4, 5, 7, 6], [0, 0, +1]]
  ].map(function(info) {
    return new Polygon(info[0].map(function(i) {
      const pos = new Vector(
        c.x + r[0] * (2 * Number(!!(i & 1)) - 1),
        c.y + r[1] * (2 * Number(!!(i & 2)) - 1),
        c.z + r[2] * (2 * Number(!!(i & 4)) - 1)
      );
      return new Vertex(pos, new Vector(...info[1] as [number, number, number]));
    }));
  }));
}

/**
 * Construct a solid sphere. Optional parameters are `center`, `radius`,
 * `slices`, and `stacks`, which default to `[0, 0, 0]`, `1`, `16`, and `8`.
 * The `slices` and `stacks` parameters control the tessellation along the
 * longitude and latitude directions.
 * 
 * Example usage:
 * 
 *     const sphere = CSG.sphere({
 *       center: [0, 0, 0],
 *       radius: 1,
 *       slices: 16,
 *       stacks: 8
 *     });
 */
export function sphere(options: {
  center?: [number, number, number];
  radius?: number;
  slices?: number;
  stacks?: number;
}) {
  options = options || {};
  const c = new Vector(...options.center || [0, 0, 0]);
  const r = options.radius || 1;
  const slices = options.slices || 16;
  const stacks = options.stacks || 8;
  const polygons: Polygon[] = [];
  let vertices: Vertex[] = [];
  function vertex(theta: number, phi: number) {
    theta *= Math.PI * 2;
    phi *= Math.PI;
    const dir = new Vector(
      Math.cos(theta) * Math.sin(phi),
      Math.cos(phi),
      Math.sin(theta) * Math.sin(phi)
    );
    vertices.push(new Vertex(c.plus(dir.times(r)), dir));
  }
  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < stacks; j++) {
      vertices = [];
      vertex(i / slices, j / stacks);
      if (j > 0) vertex((i + 1) / slices, j / stacks);
      if (j < stacks - 1) vertex((i + 1) / slices, (j + 1) / stacks);
      vertex(i / slices, (j + 1) / stacks);
      polygons.push(new Polygon(vertices));
    }
  }
  return Solid.fromPolygons(polygons);
}

/**
 * Construct a solid cylinder. Optional parameters are `start`, `end`,
 * `radius`, and `slices`, which default to `[0, -1, 0]`, `[0, 1, 0]`, `1`, and
 * `16`. The `slices` parameter controls the tessellation.
 * 
 * Example usage:
 * 
 *     const cylinder = CSG.cylinder({
 *       start: [0, -1, 0],
 *       end: [0, 1, 0],
 *       radius: 1,
 *       slices: 16
 *     });
 */
export function cylinder(options: {
  start?: [number, number, number];
  end?: [number, number, number];
  radius?: number;
  slices?: number;
}) {
  options = options || {};
  const s = new Vector(...options.start || [0, -1, 0]);
  const e = new Vector(...options.end || [0, 1, 0]);
  const ray = e.minus(s);
  const r = options.radius || 1;
  const slices = options.slices || 16;
  const axisZ = ray.unit(), isY = (Math.abs(axisZ.y) > 0.5);
  const axisX = new Vector(Number(isY), Number(!isY), 0).cross(axisZ).unit();
  const axisY = axisX.cross(axisZ).unit();
  const start = new Vertex(s, axisZ.negated());
  const end = new Vertex(e, axisZ.unit());
  const polygons: Polygon[] = [];
  function point(stack: number, slice: number, normalBlend: number) {
    const angle = slice * Math.PI * 2;
    const out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
    const pos = s.plus(ray.times(stack)).plus(out.times(r));
    const normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend));
    return new Vertex(pos, normal);
  }
  for (let i = 0; i < slices; i++) {
    const t0 = i / slices, t1 = (i + 1) / slices;
    polygons.push(new Polygon([start, point(0, t0, -1), point(0, t1, -1)]));
    polygons.push(new Polygon([point(0, t1, 0), point(0, t0, 0), point(1, t0, 0), point(1, t1, 0)]));
    polygons.push(new Polygon([end, point(1, t1, 1), point(1, t0, 1)]));
  }
  return Solid.fromPolygons(polygons);
}

interface VectorLike {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a 3D vector.
 * 
 * Example usage:
 * 
 *     new Vector(1, 2, 3);
 *     Vector.from(otherVector);
 *     Vector.fromVectorLike({ x: 1, y: 2, z: 3 });
 */
export class Vector {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static from(other: Vector): Vector {
    return new Vector(other.x, other.y, other.z);
  }

  static fromVectorLike(other: VectorLike): Vector {
    return new Vector(other.x, other.y, other.z);
  }

  clone(): Vector {
    return new Vector(this.x, this.y, this.z);
  }

  negated(): Vector {
    return new Vector(-this.x, -this.y, -this.z);
  }

  plus(a: VectorLike): Vector {
    return new Vector(this.x + a.x, this.y + a.y, this.z + a.z);
  }

  minus(a: VectorLike): Vector {
    return new Vector(this.x - a.x, this.y - a.y, this.z - a.z);
  }

  times(a: number): Vector {
    return new Vector(this.x * a, this.y * a, this.z * a);
  }

  dividedBy(a: number): Vector {
    return new Vector(this.x / a, this.y / a, this.z / a);
  }

  dot(a: VectorLike): number {
    return this.x * a.x + this.y * a.y + this.z * a.z;
  }

  lerp(a: Vector, t: number): Vector {
    return this.plus(a.minus(this).times(t));
  }

  length(): number {
    return Math.sqrt(this.dot(this));
  }

  unit(): Vector {
    return this.dividedBy(this.length());
  }

  cross(a: VectorLike): Vector {
    return new Vector(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
    );
  }
}

/**
 * Represents a vertex of a polygon. Use your own vertex class instead of this
 * one to provide additional features like texture coordinates and vertex
 * colors. Custom vertex classes need to provide a `pos` property and `clone()`,
 * `flip()`, and `interpolate()` methods that behave analogous to the ones
 * defined by `Vertex`. This class provides `normal` so convenience
 * functions like `sphere()` can return a smooth vertex normal, but `normal`
 * is not used anywhere else.
 */
export class Vertex {
  pos: Vector;
  normal: Vector;

  /**
   * This constructor assumes ownership of both parameters, so make sure you clone
   * them first if need be.
   */
  constructor(pos: Vector, normal: Vector) {
    this.pos = pos;
    this.normal = normal;
  }

  clone(): Vertex {
    return new Vertex(this.pos.clone(), this.normal.clone());
  }

  /**
   * Invert all orientation-specific data (e.g. vertex normal). Called when the
   * orientation of a polygon is flipped.
   */
  flip(): void {
    this.normal = this.normal.negated();
  }

  /**
   * Create a new vertex between this vertex and `other` by linearly
   * interpolating all properties using a parameter of `t`. Subclasses should
   * override this to interpolate additional properties.
   */
  interpolate(other: Vertex, t: number):Vertex {
    return new Vertex(
      this.pos.lerp(other.pos, t),
      this.normal.lerp(other.normal, t)
    );
  }
}

/** Represents a plane in 3D space. */
export class Plane {
  normal: Vector;
  w: number;

  constructor(normal: Vector, w: number) {
    this.normal = normal;
    this.w = w;
  }

  /**
   * `Plane.EPSILON` is the tolerance used by `splitPolygon()` to decide if a
   * point is on the plane.
   */
  static EPSILON = 1e-5;

  static fromPoints(a: Vector, b: Vector, c: Vector): Plane {
    const n = b.minus(a).cross(c.minus(a)).unit();
    return new Plane(n, n.dot(a));
  }

  clone(): Plane {
    return new Plane(this.normal.clone(), this.w);
  }

  flip(): void {
    this.normal = this.normal.negated();
    this.w = -this.w;
  }

  /**
   * Split `polygon` by this plane if needed, then put the polygon or polygon
   * fragments in the appropriate lists. Coplanar polygons go into either
   * `coplanarFront` or `coplanarBack` depending on their orientation with
   * respect to this plane. Polygons in front or in back of this plane go into
   * either `front` or `back`.
   */
  splitPolygon<T>(polygon: Polygon<T>, coplanarFront: Polygon<T>[], coplanarBack: Polygon<T>[], front: Polygon<T>[], back: Polygon[]): void {
    const COPLANAR = 0;
    const FRONT = 1;
    const BACK = 2;
    const SPANNING = 3;

    // Classify each point as well as the entire polygon into one of the above
    // four classes.
    let polygonType = 0;
    const types: number[] = [];
    for (let i = 0; i < polygon.vertices.length; i++) {
      const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      const type = (t < -Plane.EPSILON) ? BACK : (t > Plane.EPSILON) ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }

    // Put the polygon in the correct list, splitting it when necessary.
    switch (polygonType) {
      case COPLANAR:
        (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING:
        const f: Vertex[] = [], b: Vertex[] = [];
        for (let i = 0; i < polygon.vertices.length; i++) {
          const j = (i + 1) % polygon.vertices.length;
          const ti = types[i], tj = types[j];
          const vi = polygon.vertices[i], vj = polygon.vertices[j];
          if (ti != BACK) f.push(vi);
          if (ti != FRONT) b.push(ti != BACK ? vi.clone() : vi);
          if ((ti | tj) == SPANNING) {
            const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
            const v = vi.interpolate(vj, t);
            f.push(v);
            b.push(v.clone());
          }
        }
        if (f.length >= 3) front.push(new Polygon(f, polygon.shared));
        if (b.length >= 3) back.push(new Polygon(b, polygon.shared));
        break;
    }
  }
}

/**
 * Represents a convex polygon. The vertices used to initialize a polygon must
 * be coplanar and form a convex loop. They do not have to be `Vertex`
 * instances but they must behave similarly (duck typing can be used for
 * customization).
 * 
 * Each convex polygon has a `shared` property, which is shared between all
 * polygons that are clones of each other or were split from the same polygon.
 * This can be used to define per-polygon properties (such as surface color).
 */
export class Polygon<S = unknown> {
  vertices: Vertex[];
  shared: S | undefined;
  plane: Plane;

  constructor(vertices: Vertex[], shared?: S) {
    this.vertices = vertices;
    this.shared = shared;
    this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
  }

  clone() {
    const vertices = this.vertices.map(function(v) { return v.clone(); });
    return new Polygon(vertices, this.shared);
  }

  flip() {
    this.vertices.reverse().map(function(v) { v.flip(); });
    this.plane.flip();
  }
}

/**
 * Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
 * by picking a polygon to split along. That polygon (and all other coplanar
 * polygons) are added directly to that node and the other polygons are added to
 * the front and/or back subtrees. This is not a leafy BSP tree since there is
 * no distinction between internal and leaf nodes.
 */
export class Node<S = unknown> {
  plane: Plane | null;
  front: Node<S> | null;
  back: Node<S> | null;
  polygons: Polygon<S>[] = [];

  constructor(polygons?: Polygon<S>[]) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons) this.build(polygons);
  }

  clone(): Node<S> {
    const node = new Node<S>();
    node.plane = this.plane && this.plane.clone();
    node.front = this.front && this.front.clone();
    node.back = this.back && this.back.clone();
    node.polygons = this.polygons.map(function(p) { return p.clone(); });
    return node;
  }

  /** Convert solid space to empty space and empty space to solid space. */
  invert() {
    for (let i = 0; i < this.polygons.length; i++) {
      this.polygons[i].flip();
    }
    this.plane!.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const temp = this.front;
    this.front = this.back;
    this.back = temp;
  }

  /** Recursively remove all polygons in `polygons` that are inside this BSP tree. */
  clipPolygons<T>(polygons: Polygon<T>[]): Polygon<T>[] {
    if (!this.plane) return polygons.slice();
    let front: Polygon<T>[] = [], back: Polygon<T>[] = [];
    for (let i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  }

  /** Remove all polygons in this BSP tree that are inside the other BSP tree `bsp` */
  clipTo(bsp: Node) {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  /** Return a list of all polygons in this BSP tree. */
  allPolygons(): Polygon<S>[] {
    let polygons = this.polygons.slice();
    if (this.front) polygons = polygons.concat(this.front.allPolygons());
    if (this.back) polygons = polygons.concat(this.back.allPolygons());
    return polygons;
  }

  /**
   * Build a BSP tree out of `polygons`. When called on an existing tree, the
   * new polygons are filtered down to the bottom of the tree and become new
   * nodes there. Each set of polygons is partitioned using the first polygon
   * (no heuristic is used to pick a good split).
   */
  build(polygons: Polygon<S>[]) {
    if (!polygons.length) return;
    if (!this.plane) this.plane = polygons[0].plane.clone();
    const front: Polygon<S>[] = [], back: Polygon<S>[] = [];
    for (let i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
    }
    if (front.length) {
      if (!this.front) this.front = new Node<S>();
      this.front.build(front);
    }
    if (back.length) {
      if (!this.back) this.back = new Node<S>();
      this.back.build(back);
    }
  }
}
