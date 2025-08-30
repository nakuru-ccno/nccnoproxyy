// server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';

const app = express();
const upload = multer();
app.use(cors());

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdToqCB5wDv_IA4xrcLZoxTsKc9xLHMdS35Fg52Cb_Ov2bs9ywO1TT90gLTTPE4-6Gwg/exec'; // <-- replace with your Apps Script deploy URL

app.get('/', (req, res) => res.send('CCNO Proxy Running'));

// Endpoint to receive frontend uploads
app.post('/upload-evidence', upload.any(), async (req, res) => {
  try {
    const { evidenceName, category, subCounty } = req.body;

    if (!evidenceName || !category || !subCounty) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Build FormData to send to Apps Script
    const formData = new FormData();
    formData.append('evidenceName', evidenceName);
    formData.append('category', category);
    formData.append('subCounty', subCounty);

    if (req.files) {
      req.files.forEach(file => {
        formData.append('files', file.buffer, file.originalname);
      });
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CCNO Proxy Running on port ${PORT}`));

