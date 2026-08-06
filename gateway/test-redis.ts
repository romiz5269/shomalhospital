import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  connectTimeout: 5000,
});

redis.on("connect", () => {
  console.log("connected");
});

redis.on("ready", async () => {
  console.log("ready");

  const pong = await redis.ping();

  console.log("PING:", pong);

  process.exit(0);
});

redis.on("error", (err) => {
  console.error("ERROR:", err);
});

redis.on("close", () => {
  console.log("closed");
});

redis.on("reconnecting", () => {
  console.log("reconnecting");
});
