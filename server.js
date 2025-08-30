// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Your Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdToqCB5wDv_IA4xrcLZoxTsKc9xLHMdS35Fg52Cb_Ov2bs9ywO1TT90gLTTPE4-6Gwg/exec";

// Upload endpoint
app.post("/upload-evidence", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { evidenceName, category, subCounty } = req.body;

    // Prepare FormData to send to Apps Script
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), req.file.originalname);
    form.append("evidenceName", evidenceName || "");
    form.append("category", category || "");
    form.append("subCounty", subCounty || "");

    // Send to Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: form
    });

    const data = await response.text();

    // Delete local file
    fs.unlinkSync(req.file.path);

    res.status(200).send(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("NCCNO Proxy Server is running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
