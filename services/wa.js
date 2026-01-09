const dotenv = require("dotenv");

dotenv.config();
const waHost = process.env.waHost;
const waToken = process.env.waToken;
const waGroup = process.env.waGroup;

const send = async (msg) => {
  try {
    const form = new FormData();
    form.append("target", waGroup);
    form.append("message", msg);
    form.append("countryCode", "62");

    const res = await fetch(waHost, {
      method: "POST",
      headers: { Authorization: waToken },
      body: form,
    });

    const data = await res.json();

    return {
      success: res.ok,
      code: res.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      code: 500,
      data: err.message,
    };
  }
};

module.exports = { send };
