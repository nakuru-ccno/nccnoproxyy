import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// ✅ Updated Apps Script Web App URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySOCxNBeVfonT6JUxtBx8oC3OWmnfq2YLlT4Ysz8KZsoUqsQ4zfjLIg-agLBvWE9pkwQ/exec";

app.post("/upload-evidence", upload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const { evidenceName, category, subCounty } = req.body;
    if (!evidenceName || !category || !subCounty)
      return res.status(400).json({ error: "Missing required fields" });

    const form = new FormData();
    form.append("evidenceName", evidenceName);
    form.append("category", category);
    form.append("subCounty", subCounty);

    // Append files as file0, file1, ...
    req.files.forEach((file, index) => {
      const fileName = `${evidenceName} – ${subCounty}${
        req.files.length > 1 ? ` (${index + 1})` : ""
      }.pdf`;
      form.append(`file${index}`, fs.createReadStream(file.path), fileName);
    });

    // Send to Apps Script
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: form });
    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      return res
        .status(500)
        .json({ error: "Apps Script did not return JSON", raw: text });
    }

    // Clean up temp files
    req.files.forEach((f) => fs.unlinkSync(f.path));

    res.status(200).json({ message: "Files uploaded successfully", appsScriptResponse: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Proxy running. POST /upload-evidence to upload files."));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
