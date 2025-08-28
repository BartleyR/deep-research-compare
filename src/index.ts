import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from 'dotenv';
import { ResearchService } from './services/research.service';
import { FileInput } from './interfaces';

config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and common document formats
    const allowedMimes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'text/markdown',
      'text/x-markdown',
      'application/pdf',
      'application/xml',
      'text/xml'
    ];
    
    // Allow all text/* types
    if (file.mimetype.startsWith('text/') || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`Rejected file ${file.originalname} with mime type ${file.mimetype}`);
      cb(null, true); // Still accept but will be filtered out when reading
    }
  }
});

app.use(express.json());
app.use(express.static('public'));

const researchService = new ResearchService();

app.post('/api/research', (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum file size is 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ error: 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { prompt, models, providers } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let fileInputs: FileInput[] = [];
    
    if (req.files && Array.isArray(req.files)) {
      const fs = await import('fs');
      const filePromises = req.files.map(async (file) => {
        try {
          // Try to read as text file
          const content = await fs.promises.readFile(file.path, 'utf-8');
          return {
            name: file.originalname,
            content: content,
            mimeType: file.mimetype
          };
        } catch (error) {
          // If reading as text fails, it might be a binary file
          console.warn(`Could not read ${file.originalname} as text, skipping:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(filePromises);
      // Filter out null entries (files that couldn't be read)
      fileInputs = results.filter((f): f is FileInput => f !== null);
      
      // Clean up uploaded files after reading them
      await Promise.all(
        req.files.map(file => fs.promises.unlink(file.path).catch(err => 
          console.error(`Failed to delete temp file ${file.path}:`, err)
        ))
      );
    }

    const selectedProviders = providers ? JSON.parse(providers) : undefined;
    const modelSelections = models ? JSON.parse(models) : undefined;
    const requestId = await researchService.submitResearch(
      prompt, 
      fileInputs, 
      modelSelections, 
      selectedProviders
    );
    res.json({ requestId });
  } catch (error) {
    console.error('Error submitting research:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/research/:id', (req, res) => {
  const comparison = researchService.getResearchComparison(req.params.id);
  
  if (!comparison) {
    return res.status(404).json({ error: 'Research not found' });
  }
  
  res.json(comparison);
});

app.get('/api/research', (req, res) => {
  const comparisons = researchService.getAllComparisons();
  res.json(comparisons);
});

app.get('/api/providers', (req, res) => {
  const providers = researchService.getAvailableProviders();
  const models = researchService.getProviderModels();
  res.json({ providers, models });
});

app.post('/api/test/:provider', async (req, res) => {
  try {
    const providerName = req.params.provider;
    const { model } = req.body;
    const result = await researchService.testProvider(providerName, model);
    res.json(result);
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/research/:id/evaluate', (req, res) => {
  const { criteria, scores } = req.body;
  
  if (!criteria || !scores) {
    return res.status(400).json({ error: 'Criteria and scores are required' });
  }
  
  researchService.evaluateResponses(req.params.id, criteria, scores);
  res.json({ success: true });
});

app.post('/api/research/:id/preference', (req, res) => {
  const { provider } = req.body;
  
  if (!provider) {
    return res.status(400).json({ error: 'Provider is required' });
  }
  
  researchService.setPreferredResponse(req.params.id, provider);
  res.json({ success: true });
});

app.post('/api/research/:id/analyze', async (req, res) => {
  try {
    const { evaluationInstructions } = req.body;
    const comparison = researchService.getResearchComparison(req.params.id);
    
    if (!comparison) {
      return res.status(404).json({ error: 'Research not found' });
    }

    const analysis = await researchService.analyzeResponses(comparison, evaluationInstructions);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing responses:', error);
    res.status(500).json({ error: 'Failed to analyze responses' });
  }
});

app.listen(port, () => {
  console.log(`Research comparison server running at http://localhost:${port}`);
});