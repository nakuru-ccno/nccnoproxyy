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

// ✅ Your Apps Script Web App URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRsBzxnTaH6VBJ-wqR4d9ej21W9ttO__1VBHDZIHl8mb-EdplrbgMwuaCSsJQc8tWYxA/exec";

app.post("/upload-evidence", upload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { evidenceName, category, subCounty } = req.body;
    if (!evidenceName || !category || !subCounty) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const form = new FormData();
    form.append("evidenceName", evidenceName);
    form.append("category", category);
    form.append("subCounty", subCounty);

    // Append all files with the SAME field name "files"
    req.files.forEach((file, index) => {
      const fileName = req.files.length > 1
        ? `${evidenceName} – ${subCounty} (${index + 1}).pdf`
        : `${evidenceName} – ${subCounty}.pdf`;

      form.append("files", fs.createReadStream(file.path), {
        filename: fileName,
        contentType: "application/pdf",
      });
    });

    // Send request to Apps Script
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: form });
    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Apps Script returned non-JSON:", text);
      return res.status(500).json({ error: "Apps Script did not return JSON", raw: text });
    }

    console.log("Apps Script response:", result);

    // Clean up temporary files
    req.files.forEach(file => fs.unlinkSync(file.path));

    res.status(200).json({ message: "Files uploaded successfully", appsScriptResponse: result });
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Proxy server running. Use POST /upload-evidence to upload files.");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
