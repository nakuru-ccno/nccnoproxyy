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

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPm2ppeGt-fkElDhtqH-mp57TPK0TXSnDibCmAX6mhWioqbtnrSZRLStVsMb6-HkJpOw/exec";

// Health check endpoint for uptime monitors
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Proxy is running" });
});

app.post("/upload-evidence", upload.array("files", 5), async (req, res) => {
  try {
    const { evidenceName, category, subCounty } = req.body;

    if (!evidenceName || !category || !subCounty || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Missing required fields or files" });
    }

    // Convert files to base64
    const files = req.files.map(file => {
      const content = fs.readFileSync(file.path, { encoding: "base64" });
      return { name: file.originalname, content };
    });

    // Immediately respond to frontend before waiting for Apps Script
    res.status(200).json({
      message: "Upload request sent to proxy successfully",
      uploadedFiles: files.map(f => f.name)
    });

    // Send JSON to Apps Script asynchronously (fire-and-forget)
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ evidenceName, category, subCounty, files }),
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

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
