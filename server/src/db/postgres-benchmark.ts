
import "dotenv/config";
import { performance } from "node:perf_hooks";
import pool from "./index.ts";

const TOTAL_REQUESTS = 100;
const DROP_ID = "drop_1";

async function benchmarkPostgres() {
  const latencies: number[] = [];

  try {
    console.log("Starting PostgreSQL benchmark...");
    console.log(`Drop ID: ${DROP_ID}`);
    console.log(`Total requests: ${TOTAL_REQUESTS}`);
    console.log("--------------------------------");

    // Verify the record exists before benchmarking.
    const check = await pool.query(
      "SELECT id FROM drops WHERE id = $1",
      [DROP_ID]
    );

    if (check.rows.length === 0) {
      throw new Error(`Drop "${DROP_ID}" does not exist.`);
    }

    // Warm up the connection and query path.
    await pool.query(
      "SELECT * FROM drops WHERE id = $1",
      [DROP_ID]
    );

    // Run 100 sequential queries.
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const start = performance.now();

      const result = await pool.query(
        "SELECT * FROM drops WHERE id = $1",
        [DROP_ID]
      );

      const end = performance.now();

      if (result.rows.length === 0) {
        throw new Error("Drop disappeared during the benchmark.");
      }

      latencies.push(end - start);
    }

    const sorted = [...latencies].sort((a, b) => a - b);

    function percentile(p: number): number {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[index];
    }

    const average =
      latencies.reduce((sum, value) => sum + value, 0) /
      latencies.length;

    console.log("Benchmark results");
    console.log("--------------------------------");
    console.log(`Total requests: ${latencies.length}`);
    console.log(`Average latency: ${average.toFixed(3)} ms`);
    console.log(`Min latency: ${Math.min(...latencies).toFixed(3)} ms`);
    console.log(`Max latency: ${Math.max(...latencies).toFixed(3)} ms`);
    console.log(`p50 latency: ${percentile(50).toFixed(3)} ms`);
    console.log(`p95 latency: ${percentile(95).toFixed(3)} ms`);
    console.log(`p99 latency: ${percentile(99).toFixed(3)} ms`);
  } catch (error) {
    console.error("PostgreSQL benchmark failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await benchmarkPostgres();
