// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup for temporary storage
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// Your Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdToqCB5wDv_IA4xrcLZoxTsKc9xLHMdS35Fg52Cb_Ov2bs9ywO1TT90gLTTPE4-6Gwg/exec";

// Accept file under ANY field name
app.post("/upload-evidence", upload.any(), async (req, res) => {
  try {
    console.log("Received req.body:", req.body);
    console.log("Received req.files:", req.files);

    // Pick first file (whatever key was used)
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded. Make sure 'file' is in form-data." });
    }

    const { evidenceName, category, subCounty } = req.body;

    const missingFields = [];
    if (!evidenceName) missingFields.push("evidenceName");
    if (!category) missingFields.push("category");
    if (!subCounty) missingFields.push("subCounty");

    if (missingFields.length > 0) {
      return res.status(400).json({ error: "Missing required fields", fields: missingFields });
    }

    // Prepare form-data to send to Apps Script
    const form = new FormData();
    form.append("file", fs.createReadStream(file.path), file.originalname);
    form.append("evidenceName", evidenceName);
    form.append("category", category);
    form.append("subCounty", subCounty);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: form,
    });

    const text = await response.text();
    console.log("Apps Script response:", text);

    fs.unlinkSync(file.path); // delete temp file

    res.status(200).json({ message: "File uploaded successfully", appsScriptResponse: text });
  } catch (err) {
    console.error("Error in /upload-evidence:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Proxy server running. Use /upload-evidence to POST files.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
