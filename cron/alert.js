const { CronJob } = require("cron");
const host_status = require("../modules/host_status");

const status = new CronJob("0 * * * * *", async () => {
  try {
    await host_status.bip();
  } catch (e) {
    console.error("cron error:", e);
  }
});

const start = () => {
  status.start();
};

module.exports = { start };
