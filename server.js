import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const levelsPath = path.join(__dirname, "data", "levels.json");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/levels", async (_req, res) => {
  try {
    const raw = await fs.readFile(levelsPath, "utf-8");
    const levels = JSON.parse(raw);
    res.json({ levels });
  } catch (error) {
    res.status(500).json({ error: "Failed to load levels" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Space Invaders server running on http://localhost:${PORT}`);
});
