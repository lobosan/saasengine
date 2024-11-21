import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { DataCollector } from './src/dataCollector.js';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
async function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${context}\nError: ${error.stack || error}\n\n`;
  
  try {
    await fs.appendFile('server.log', logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
  console.error(`${context}:`, error);
}

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: 'https://models.inference.ai.azure.com'
});

const dataCollector = new DataCollector();

// Error handling middleware
app.use((err, req, res, next) => {
  logError(err, 'Unhandled Error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-idea', async (req, res) => {
  try {
    console.log('Collecting market data...');
    const marketData = await dataCollector.collectAllData();
    const insights = dataCollector.extractKeyInsights(marketData);
    
    console.log('Generating idea with AI...');
    const prompt = `Based on current market trends and insights, generate an innovative B2B SaaS idea. Here's the market data:

Trending Topics: ${insights.trends}

Recent Insights: ${insights.insights}

Please generate a B2B SaaS idea that:
1. Addresses a clear business need
2. Is feasible for a solo developer
3. Has potential for recurring revenue
4. Can be built with modern web technologies

Format the response as:
{
  "idea": "Brief name/title",
  "description": "2-3 sentence description",
  "targetMarket": "Primary target customers",
  "keyFeatures": ["3-4 key features"],
  "techStack": ["Suggested technologies"]
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an AI that generates innovative B2B SaaS ideas based on market data." },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500
    });

    const idea = JSON.parse(completion.choices[0].message.content);
    res.json({ idea, insights });
  } catch (error) {
    await logError(error, 'Error in /generate-idea endpoint');
    
    // Send a more detailed error response
    const errorResponse = {
      error: error.message,
      type: error.constructor.name,
      details: error.response?.data || error.response || null
    };
    
    // If it's a JSON parsing error, include the raw content
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      errorResponse.rawContent = completion?.choices[0]?.message?.content;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
