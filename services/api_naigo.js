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

module.exports = { get };
