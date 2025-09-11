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
app.use(express.json({ limit: "50mb" }));

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygcDNQ4ZhE9AWjlRgwVqwqmkZqXiSxUZEGsqPqCcV3nc1bC6PQfA2_RZ7l5oDBnYl4/exec";

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/upload-evidence", upload.array("files", 10), async (req, res) => {
  try {
    const { evidenceName, category, indicator, subCounty, officerEmail } = req.body;

    if (!evidenceName || !category || !indicator || !subCounty || !officerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files.map(f => ({
      name: f.originalname,
      content: fs.readFileSync(f.path, { encoding: "base64" })
    }));

    // Immediate response to frontend
    res.status(200).json({
      message: "✅ Upload received by proxy and is being processed in the background",
      uploadedFiles: files.map(f => f.name)
    });

    // Send to Apps Script asynchronously
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        evidenceName,
        category,
        indicator,
        subCounty,
        uploaderEmail: officerEmail,
        files
      }),
      headers: { "Content-Type": "application/json" }
    })
      .then(r => r.json())
      .then(result => console.log("Apps Script response:", result))
      .catch(err => console.error("Error sending to Apps Script:", err))
      .finally(() => {
        // Cleanup temp files
        req.files.forEach(f => fs.unlink(f.path, () => {}));
      });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
