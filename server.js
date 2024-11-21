import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client with GitHub endpoint
const client = new OpenAI({ 
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN
});

app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle idea generation endpoint
app.post('/generate-idea', async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a startup idea generator for solo entrepreneurs. Generate a unique, innovative SaaS business idea that solves a specific problem."
        },
        {
          role: "user",
          content: "Generate a novel SaaS business idea for a solo entrepreneur with potential for growth and minimal initial investment."
        }
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 1000
    });

    const idea = response.choices[0]?.message?.content || "No idea generated";
    res.json({ idea });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Idea generation failed"
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
