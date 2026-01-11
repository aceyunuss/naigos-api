const dotenv = require("dotenv");

dotenv.config();
const apiKey = process.env.apiKey;
const apiHost = process.env.apiHost;

const get = async (endpoint) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  const url = apiHost + endpoint + "?apikey=" + apiKey;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type");
    const data = contentType && contentType.includes("application/json") ? await res.json() : await res.text();

    return {
      success: res.ok,
      code: res.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      code: err.name === "AbortError" ? 408 : 500,
      data: err.message,
    };
  } finally {
    clearTimeout(id);
  }
};

const status = async () => {
  try {
    const res = await fetch(apiHost + "objects/hoststatus?apikey=" + apiKey);
    const data = await res.json();
    console.log(data?.error ? `[NAIGO] error : ${data.error}` : "[NAIGO] service ready");
  } catch (err) {
    console.log("[NAIGO] error:", err.message || err);
  }
};

module.exports = { get, status };
