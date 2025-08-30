import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const upload = multer(); // handles multipart/form-data

// Allow all origins for testing (CORS)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "example@gmail.com";
const MAIN_FOLDER_ID = process.env.MAIN_FOLDER_ID || "dummy";

// Example POST endpoint for uploads
app.post("/upload-evidence", upload.any(), (req, res) => {
  try {
    // For demo: log files and form data
    const evidenceName = req.body.evidenceName;
    const category = req.body.category;
    const subCounty = req.body.subCounty;

    const files = req.files.map(f => ({
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
    }));

    console.log({ evidenceName, category, subCounty, files });

    // TODO: Replace DriveApp/GmailApp with storage/email service
    res.json({ success: true, message: "Files received", files });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check
app.get("/", (req, res) => res.send("CCNO Proxy Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
