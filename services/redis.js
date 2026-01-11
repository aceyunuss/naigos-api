const { createClient } = require("redis");

const redis = createClient({
  socket: {
    host: "192.168.22.216",
    port: 6379,
  },
  database: 1,
});

redis.on("connect", () => {
  console.log("[REDIS] service connecting...");
});

redis.on("ready", () => {
  console.log("[REDIS] service ready");
});

redis.on("error", (err) => {
  console.error("[REDIS] error : ", err);
});

module.exports = redis;
