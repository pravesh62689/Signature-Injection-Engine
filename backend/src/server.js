import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import signRoutes from "./routes/signPdf.routes.js";
import { connectDb } from "./db/connectDb.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!allowedOrigins.length) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const storageDir = path.join(process.cwd(), "storage");

app.use(
  "/files",
  express.static(storageDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

app.use("/api", signRoutes);

app.get("/", (req, res) => res.send("API running"));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 8090;

async function start() {
  try {
    await connectDb();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", (err && err.message) || err);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (reason) => {
  console.error("UnhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UncaughtException:", err);
  process.exit(1);
});
