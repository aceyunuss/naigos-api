const alert = require("./cron/alert");
const redis = require("./services/redis");
const naigo = require("./services/naigo");
const wa = require("./services/wa");

(async () => {
  try {
    await redis.connect();
    await Promise.all([naigo.status(), wa.status()]);

    alert.start();
  } catch (err) {
    console.error("[]Startup failed:", err);
    process.exit(1);
  }
})();
