const redis = require("./services/redis");
const alert = require("./cron/alert");
const naigo = require("./services/naigo");
const wa = require("./services/wa");
const host = require("./modules/host_status");

(async () => {
  try {
    await redis.connect();
    await Promise.all([naigo.status(), wa.status()]);
    
    alert.start();
    // host.checkHost();
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
})();
