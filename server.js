import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Multer to temporarily store files
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "50mb" })); // JSON body

// Replace with your Google Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxpDu4P6FC6YVwvwbYgOiDbrF7FFCXvTQOlGpTTuRjkjCapvdcy16fo6HDJniUlCHMqPA/exec";

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Proxy is running" });
});

/**
 * Upload endpoint supports:
 * 1. JSON with base64 files
 * 2. FormData multipart file uploads
 */
app.post("/upload-evidence", upload.array("files", 10), async (req, res) => {
  try {
    let { evidenceName, category, indicator, subCounty, files } = req.body;

    // If no files in JSON, check Multer uploads (FormData)
    if ((!files || files.length === 0) && req.files && req.files.length > 0) {
      files = req.files.map(f => ({
        name: f.originalname,
        content: fs.readFileSync(f.path, { encoding: "base64" }),
      }));
    }

    // Validate all fields
    if (!evidenceName || !category || !indicator || !subCounty || !files || files.length === 0) {
      return res.status(400).json({ error: "Missing required fields or files" });
    }

    // Debug logs
    console.log("Received data:", { evidenceName, category, indicator, subCounty });
    console.log("Number of files:", files.length);

    // Immediate response to frontend
    res.status(200).json({
      message: "✅ Upload received by proxy and is being processed in the background",
      uploadedFiles: files.map(f => f.name),
    });

    // Send to Apps Script asynchronously
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ evidenceName, category, indicator, subCounty, files }),
      headers: { "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(result => console.log("Apps Script response:", result))
      .catch(err => console.error("Error sending to Apps Script:", err))
      .finally(() => {
        // Cleanup temp files
        if (req.files) {
          req.files.forEach(f => fs.unlink(f.path, () => {}));
        }
      });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
  startSelfPing();
});

// Self-ping loop to prevent Render free-tier from sleeping
function startSelfPing() {
  const PROXY_URL = `http://localhost:${PORT}/health`;
  const PING_INTERVAL_MIN = 14;
  const ACTIVE_START_HOUR = 6;
  const ACTIVE_END_HOUR = 22;

  async function ping() {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR) {
      try {
        const res = await fetch(PROXY_URL);
        console.log(`[${now.toLocaleTimeString()}] Self-ping ${res.ok ? "successful" : "failed"}`);
      } catch (err) {
        console.error(`[${now.toLocaleTimeString()}] Self-ping error:`, err.message);
      }
    } else {
      console.log(`[${now.toLocaleTimeString()}] Outside active hours. No ping.`);
    }

    setTimeout(ping, PING_INTERVAL_MIN * 60 * 1000);
  }

  ping();
}
