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
    console.error('Error handling AI query:', error?.message);
    return res.status(500).json({ error: 'Unable to process AI query at this time. Please consult your faculty advisor.' });
  }
});
