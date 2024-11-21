import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { DataCollector } from './src/dataCollector.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: 'https://models.inference.ai.azure.com'
});

const dataCollector = new DataCollector();

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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
