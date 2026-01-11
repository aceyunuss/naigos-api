const naigo = require("../services/naigo");
const wa = require("../services/wa");

const checkHost = async () => {
  const status = await naigo.get("objects/hoststatus");
  const down = [];

  for (const e of status.data.hoststatus) {
    if (e.output.includes("OK")) continue;
    down.push(parseNotif(down, e));
  }

  if (down.length > 0) notifyDown(down);
};

const parseNotif = (prev, data) => {
  const head = prev.length == 0 ? "🚨 PERINGATAN 🚨" : "";
  const status = data.output.split(" ")[0];

  return `${head}

⚠️  Status         : ${status}
🖥️  Host            : ${data.host_name}
🌐  IP                 : ${data.address}
⏰  Last Check : ${data.last_check}
📝  Message     : ${data.output}
`;
};

const notifyDown = async (message) => {
  const msg = message.join("");  
  await wa.send(msg);
};

const bip = async () => {
  checkHost();
};

module.exports = { bip, checkHost };
