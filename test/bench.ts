type Options = {
    minSamples?: number;
    minRuntimeMs?: number;
    progress?: (collected: number, min: number) => void;
};

export function benchmark<T>(setup: () => T, run: (t: T) => void, options: Options = {}): Result {
    const allSamples: number[][] = [];
    let totalSamples = 0;
    let endTime = Date.now() + (options.minRuntimeMs ?? 300); // run for 300ms at least
    const minSamples = options.minSamples ?? 200;

    // We measure in chunks of 100 to periodically work the garbage collector.
    // This acts like a "dither" to smooth out the fluctuating memory usage caused
    // by the benchmarking engine itself (https://en.wikipedia.org/wiki/Dither).
    // See: https://github.com/JoshuaWise/nodemark/tree/master/lib/benchmark.js
    do {
        generateSamples(() => {}, () => {}, 10); // Fake/dither benchmark
        const samples = generateSamples(setup, run, 10); // Actual benchmark
        allSamples.push(samples);
        totalSamples += samples.length;
        options.progress?.(totalSamples, minSamples);
    } while (Date.now() < endTime || totalSamples < minSamples);

    return resultFromSamples(allSamples.flat());
}

function generateSamples<T>(setup: () => T, run: (t: T) => void, n: number): number[] {
    const samplesMs: number[] = [];
    for (let i = 0; i < n; i += 1) {
        const val = setup();
        const t1 = performance.now();
        run(val);
        const t2 = performance.now();
        samplesMs.push(t2 - t1);
    }
    return samplesMs;
}

function resultFromSamples(samples: number[]): Result {
    // Remove samples that were taken before JIT is likely to have warmed up.
    const validSamples = samples.slice(100);

    const n = validSamples.length;
    const mean = validSamples.reduce((m, s) => m + s, 0) / n;
    const hz = 1e6 / mean;

    return {
        n,
        mean,
        hz,
    };
}

export type Result = {
    /** Number of samples */
    n: number;
    /** Mean sample time (ms) */
    mean: number;
    /** Ops/sec (Hz) */
    hz: number;
};