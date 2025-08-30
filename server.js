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

// Replace with your Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0LHXIPdNuS_f7huXNSj6N1FciO7YjACFw5t0XxlVQi-VlBhTdIsPXkClxrq3DaWXwkg/exec";

app.post("/upload-evidence", upload.array("files", 5), async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received files info:", req.files);

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

    // Append each file and rename as <Evidence Name> – <Sub County>.pdf
    req.files.forEach((file, index) => {
      let fileName = `${evidenceName} – ${subCounty}.pdf`;
      // Add a counter if multiple files to avoid overwrite
      if (req.files.length > 1) {
        fileName = `${evidenceName} – ${subCounty} (${index + 1}).pdf`;
      }
      form.append("files", fs.createReadStream(file.path), fileName);
    });

    // Send to Apps Script
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: form });
    const text = await response.text();
    console.log("Apps Script response:", text);

    // Clean up temporary files
    req.files.forEach((file) => fs.unlinkSync(file.path));

    // Return success immediately (front-end does not wait for email)
    res.status(200).json({ message: "Files uploaded successfully", appsScriptResponse: text });
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
