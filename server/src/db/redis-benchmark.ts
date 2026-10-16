
import { performance } from "node:perf_hooks";
import redisClient from "./redis.ts";

const CACHE_KEY = "flashdrop:drop_1";
const TOTAL_REQUESTS = 100;

async function benchmarkRedis() {
  const latencies: number[] = [];

  try {
    // 1. Ensure the Redis connection is ready
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // 2. Verify that the key exists before benchmarking
    const cachedValue = await redisClient.get(CACHE_KEY);

    if (cachedValue === null) {
      throw new Error(
        `Redis key "${CACHE_KEY}" does not exist. Populate the cache first.`
      );
    }

    console.log("Starting Redis benchmark...");
    console.log(`Cache key: ${CACHE_KEY}`);
    console.log(`Total requests: ${TOTAL_REQUESTS}`);
    console.log("--------------------------------");

    // 3. Run 100 sequential GET requests
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const start = performance.now();

      const value = await redisClient.get(CACHE_KEY);

      const end = performance.now();

      if (value === null) {
        throw new Error("Cache key disappeared during the benchmark.");
      }

      const latency = end - start;
      latencies.push(latency);
    }

    // 4. Calculate summary statistics
    const totalLatency = latencies.reduce(
      (sum, latency) => sum + latency,
      0
    );

    const averageLatency = totalLatency / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    
const sortedLatencies = [...latencies].sort((a, b) => a - b);

function percentile(p: number): number {
  const index = Math.ceil((p / 100) * sortedLatencies.length) - 1;
  return sortedLatencies[index];
}

console.log(`p50 latency: ${percentile(50).toFixed(3)} ms`);
console.log(`p95 latency: ${percentile(95).toFixed(3)} ms`);
console.log(`p99 latency: ${percentile(99).toFixed(3)} ms`);


    // console.log("Benchmark results");
    // console.log("--------------------------------");
    // console.log(`Total requests: ${latencies.length}`);
    // console.log(`Average latency: ${averageLatency.toFixed(3)} ms`);
    // console.log(`Min latency: ${minLatency.toFixed(3)} ms`);
    // console.log(`Max latency: ${maxLatency.toFixed(3)} ms`);
  } catch (error) {
    console.error("Redis benchmark failed:", error);
    process.exitCode = 1;
  } finally {
    // This is a standalone script, so close its Redis connection.
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

await benchmarkRedis();
