import redisClient from "./redis.ts";

await redisClient.set("flashdrop:drop_1",JSON.stringify({
  "id": "drop_1",
  "name": "Limited Sneakers",
  "available_inventory": 500
}),
{
    EX:30
}
);

const value = await redisClient.get("flashdrop:drop_1");

console.log("Redis value:", JSON.parse(value));

const ttl = await redisClient.ttl("flashdrop:drop_1");

console.log("TTL:",ttl);

await redisClient.quit();