const naigo = require("../services/naigo");
const wa = require("../services/wa");
const redis = require("../services/redis");

const checkHost = async () => {
  const status = await naigo.get("objects/hoststatus");
  const prevDown = await redis.getHostNotOkDetail();
  const prevUp = await redis.getHostOkDetail();
  const newStatus = await redis.storeData(prevDown.data, prevUp.data, status.data.hoststatus);

  if (newStatus.data.down.length > 0 || newStatus.data.up.length > 0) {
    const alertMsg = parseNotif([...newStatus.data.down, ...newStatus.data.up]);
    await wa.send(alertMsg);
  }
};

const parseNotif = (data) => {
  let msg = "🚨 PERINGATAN 🚨";

  data.forEach((e) => {
    const status = (e.output || "").split(" ")[0].toUpperCase();
    const btn = status == "OK" ? "🟢" : "🔴";

    msg += `

${btn} [${e.last_check}]
${e.host_name} (${e.address})
${e.output}`;
  });

  return msg;
};

const bip = async () => {
  checkHost();
};

module.exports = { bip, checkHost };
