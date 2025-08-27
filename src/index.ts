import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from 'dotenv';
import { ResearchService } from './services/research.service';
import { FileInput } from './interfaces';

config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

const researchService = new ResearchService();

app.post('/api/research', upload.array('files'), async (req, res) => {
  try {
    const { prompt, models, providers } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let fileInputs: FileInput[] = [];
    
    if (req.files && Array.isArray(req.files)) {
      const fs = await import('fs');
      fileInputs = await Promise.all(
        req.files.map(async (file) => ({
          name: file.originalname,
          content: await fs.promises.readFile(file.path, 'utf-8'),
          mimeType: file.mimetype
        }))
      );
      
      req.files.forEach(file => fs.promises.unlink(file.path));
    }

    const selectedProviders = providers ? JSON.parse(providers) : undefined;
    const modelSelections = models ? JSON.parse(models) : undefined;
    const requestId = await researchService.submitResearch(prompt, fileInputs, modelSelections, selectedProviders);
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
    const comparison = researchService.getResearchComparison(req.params.id);
    
    if (!comparison) {
      return res.status(404).json({ error: 'Research not found' });
    }

    const analysis = await researchService.analyzeResponses(comparison);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing responses:', error);
    res.status(500).json({ error: 'Failed to analyze responses' });
  }
});

app.listen(port, () => {
  console.log(`Research comparison server running at http://localhost:${port}`);
});