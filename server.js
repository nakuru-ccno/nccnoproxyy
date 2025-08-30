import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch"; // we installed this
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // store in memory before sending to Apps Script

app.use(cors());
app.use(express.json());

// Upload route
app.post("/upload-evidence", upload.single("file"), async (req, res) => {
  try {
    const { evidenceName, category, subCounty } = req.body;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Prepare form-data for Apps Script
    const form = new FormData();
    form.append("file", req.file.buffer, req.file.originalname);
    form.append("evidenceName", evidenceName);
    form.append("category", category);
    form.append("subCounty", subCounty);

    // Your Apps Script URL
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdToqCB5wDv_IA4xrcLZoxTsKc9xLHMdS35Fg52Cb_Ov2bs9ywO1TT90gLTTPE4-6Gwg/exec";

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: form,
    });

    const result = await response.json();
    return res.json({ status: "success", data: result });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("NCCNO Proxy is live!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
