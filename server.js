import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIxstFx8df3oKdI-u62x73FhRaCD61R3GGn3IUkmaIqUa1zGk8m5VEWljProTQEXRTjg/exec";

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

    // Append files with unique field names
    req.files.forEach((file, index) => {
      const fileName = req.files.length > 1
        ? `${evidenceName} – ${subCounty} (${index + 1}).pdf`
        : `${evidenceName} – ${subCounty}.pdf`;
      form.append(`file_${index}`, fs.createReadStream(file.path), fileName);
    });

    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: form });
    const result = await response.json();
    console.log("Apps Script response:", result);

    // Clean up temporary files
    req.files.forEach(file => fs.unlinkSync(file.path));

    res.status(200).json({ message: "Files uploaded successfully", appsScriptResponse: result });
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
