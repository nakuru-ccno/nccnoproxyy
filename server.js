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

app.post("/upload-evidence", upload.array("files", 5), (req, res) => {
  const { evidenceName, category, subCounty } = req.body;

  if (!evidenceName || !category || !subCounty || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Missing required fields or files" });
  }

  // Immediately respond to front-end
  res.status(200).json({
    message: "Upload started successfully",
    uploadedFiles: req.files.map(f => `${evidenceName} – ${subCounty}.pdf`)
  });

  // Background processing
  (async () => {
    try {
      const files = req.files.map(file => ({
        name: file.originalname,
        content: fs.readFileSync(file.path, { encoding: "base64" })
      }));

      // Send to Apps Script
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ evidenceName, category, subCounty, files }),
        headers: { "Content-Type": "application/json" },
      });

      const appsScriptResponse = await response.json();
      console.log("Apps Script Response:", appsScriptResponse);

      // Cleanup temp files
      req.files.forEach(file => fs.unlinkSync(file.path));

    } catch (err) {
      console.error("Background processing failed:", err);
    }
  })();
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
