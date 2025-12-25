import axios from "axios";

const baseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:8090")
  .trim()
  .replace(/\/$/, "");

export const api = axios.create({
  baseURL: baseUrl,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

export async function burnPdf(payload) {
  try {
    const res = await api.post("/api/sign-pdf", payload);
    return res.data;
  } catch (err) {
    const msg =
      (err &&
        err.response &&
        err.response.data &&
        (err.response.data.error || err.response.data.message)) ||
      (err && err.message) ||
      "Request failed";
    throw new Error(msg);
  }
}
