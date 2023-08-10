import { Solid, Vertex } from "../csg2";

export function solidToObj(name: string, solid: Solid): string {
    const vertexData: Vertex[] = [];
    const vertexIndices = new Map<Vertex, number>();
    let idx = 1; // OBJ file vertex indices begin at 1
    for (let p of solid.polygons) {
        for (let v of p.vertices) {
            vertexData.push(v);
            vertexIndices.set(v, idx);
            idx += 1;
        }
    }

    const faceIndices: [number, number, number][] = [];
    for (let p of solid.polygons) {
        if (p.vertices.length < 3) {
            continue;
        }
        // https://en.wikipedia.org/wiki/Fan_triangulation
        for (let end = 2; end < p.vertices.length; end += 1) {
            faceIndices.push([
                vertexIndices.get(p.vertices[0])!,
                vertexIndices.get(p.vertices[end-1])!,
                vertexIndices.get(p.vertices[end])!,
            ]);
        }
    }

    const vertices = vertexData.map(({pos}) => `v ${pos.x} ${pos.y} ${pos.z}`).join("\n"); 
    const faces = faceIndices.map(f => `f ${f[0]} ${f[1]} ${f[2]}`).join("\n");
    return `o ${name}\n\n${vertices}\n\n${faces}`;
}