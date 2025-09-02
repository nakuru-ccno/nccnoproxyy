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
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3KXEFXmzInpisirjM1-OOjAMde8LKESFVHt21bOR7wYAp6SFU0TchAUse89z_0B-eHg/exec";

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Proxy is running" });
});

// File upload endpoint
app.post("/upload-evidence", upload.array("files", 5), async (req, res) => {
  try {
    const { evidenceName, category, indicator, subCounty } = req.body;

    if (!evidenceName || !category || !indicator || !subCounty || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Missing required fields or files" });
    }

    // Convert files to base64
    const files = req.files.map(file => ({
      name: `${evidenceName} – ${subCounty}.pdf`, // rename as requested
      content: fs.readFileSync(file.path, { encoding: "base64" })
    }));

    // ✅ Immediately respond to frontend (don’t wait for Drive)
    res.status(200).json({
      message: "✅ Upload received by proxy and is being processed in the background",
      uploadedFiles: files.map(f => f.name)
    });

    // 🔄 Continue sending to Apps Script asynchronously
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ evidenceName, category, indicator, subCounty, files }),
      headers: { "Content-Type": "application/json" },
    })
      .then(response => response.json())
      .then(result => console.log("Apps Script response:", result))
      .catch(err => console.error("Error sending to Apps Script:", err))
      .finally(() => {
        // Cleanup temp files
        req.files.forEach(file => fs.unlink(file.path, () => {}));
      });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
  startSelfPing(); // start ping loop when server starts
});

/**
 * Self-ping loop to prevent Render free-tier from sleeping
 * Active hours: 6 AM – 10 PM
 * Ping interval: 14 minutes
 */
function startSelfPing() {
  const PROXY_URL = `http://localhost:${PORT}/health`; // self-ping endpoint
  const PING_INTERVAL_MIN = 14;
  const ACTIVE_START_HOUR = 6;
  const ACTIVE_END_HOUR = 22;

  async function ping() {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR) {
      try {
        const res = await fetch(PROXY_URL);
        if (res.ok) {
          console.log(`[${now.toLocaleTimeString()}] Self-ping successful.`);
        } else {
          console.warn(`[${now.toLocaleTimeString()}] Self-ping failed: ${res.status}`);
        }
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
