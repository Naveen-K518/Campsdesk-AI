import { Router, Request, Response } from 'express';
import { generateCollegeAIResponse } from '../services/geminiService';

export const aiRouter = Router();

aiRouter.post('/query', async (req: Request, res: Response) => {
  try {
    const { prompt, guidelinesContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiResponse = await generateCollegeAIResponse(prompt, guidelinesContext);
    return res.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Error handling AI query:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
