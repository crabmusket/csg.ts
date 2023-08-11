import process from "node:process";
import { Solid, cube, union } from "../csg2";
import { benchmark } from "./bench";

process.stdout.write("benchmarking...");
const result = benchmark(function setup() {
    const shapes: Solid[] = [];
    for (let i = 0; i < 12; i += 1) {
        shapes.push(
            cube({
                center: [Math.random() * 5, Math.random() * 5, Math.random() * 5],
                radius: Math.random() + 1,
            })
        );
    }
    return shapes;
}, function run(shapes: Solid[]) {
    shapes.reduce((u, s) => union(u, s), shapes[0]);
}, {
    progress(done, min) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(
            `Done ${Math.round(100 * done / min).toString().padStart(2, " ")}% (${done}/${min})`
        );
    },
});
process.stdout.clearLine(0);
process.stdout.cursorTo(0);

console.log("Union of 12 cubes:", "mean", result.mean.toFixed(2), "ms,", result.hz.toFixed(2), "ops/sec");
