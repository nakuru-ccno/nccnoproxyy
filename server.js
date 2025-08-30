// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data"; // Make sure this is installed

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup for temporary storage
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// Replace with your Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdToqCB5wDv_IA4xrcLZoxTsKc9xLHMdS35Fg52Cb_Ov2bs9ywO1TT90gLTTPE4-6Gwg/exec";

app.post("/upload-evidence", upload.single("file"), async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received file info:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { evidenceName, category, subCounty } = req.body;

    if (!evidenceName || !category || !subCounty) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Prepare form-data to send to Apps Script
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), req.file.originalname);
    form.append("evidenceName", evidenceName);
    form.append("category", category);
    form.append("subCounty", subCounty);

    // Send to Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: form,
    });

    const text = await response.text();
    console.log("Apps Script response:", text);

    // Delete local file after sending
    fs.unlinkSync(req.file.path);

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
