const { createClient } = require("redis");

const {
  REDIS_URL,
  REDIS_HOST = "127.0.0.1",
  REDIS_PORT = 6379,
  REDIS_USER = "default",
  REDIS_PASSWORD,
  REDIS_TLS = "",
  REDIS_TLS_REJECT_UNAUTHORIZED = "true",
} = process.env;

const useTlsFromUrl = typeof REDIS_URL === "string" && REDIS_URL.startsWith("rediss://");
const useTlsFlag = REDIS_TLS.toLowerCase() === "true";
const useTls = useTlsFromUrl || useTlsFlag;

const redisClient = REDIS_URL
  ? createClient({
      url: REDIS_URL,
      socket: useTls
        ? { tls: true, rejectUnauthorized: REDIS_TLS_REJECT_UNAUTHORIZED !== "false" }
        : {},
    })
  : createClient({
      username: REDIS_USER,
      password: REDIS_PASSWORD,
      socket: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
        ...(useTls
          ? { tls: true, rejectUnauthorized: REDIS_TLS_REJECT_UNAUTHORIZED !== "false" }
          : {}),
      },
    });

redisClient.on("error", (err) => console.error("Redis Client Error", err));

module.exports = redisClient;