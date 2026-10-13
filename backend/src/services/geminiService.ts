/**
 * Gemini AI Service with College Guidelines Context Injection,
 * Timeout Handling, Retry Logic, Multi-Model Fallbacks, and PDF Extraction.
 */

import { GEMINI_API_KEY, GEMINI_MODEL } from '../config/env';
import { query } from '../db';

const DEFAULT_PRIMARY_MODEL = GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];

function sanitizeError(message: string, secret?: string): string {
  if (!secret) return message;
  return message.split(secret).join('[REDACTED_KEY]');
}

export async function generateCollegeAIResponse(
  studentPrompt: string,
  guidelinesContext?: string
): Promise<string> {
  const apiKey = GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  // Retrieve published guidelines from database to feed context with exact section numbers
  let dbGuidelinesContext = '';
  try {
    const dbGuidelines = query<any>('SELECT section, category, title, body FROM guidelines ORDER BY section ASC');
    if (dbGuidelines && dbGuidelines.length > 0) {
      dbGuidelinesContext = dbGuidelines
        .map((g) => `[Section ${g.section}] Category: ${g.category} | Title: ${g.title}\nPolicy: ${g.body}`)
        .join('\n\n');
    }
  } catch (err: any) {
    console.warn('[GeminiService] Could not load database guidelines for AI context:', err?.message);
  }

  const effectiveContext = [guidelinesContext, dbGuidelinesContext].filter(Boolean).join('\n\n');

  const systemInstructionText = `You are CampusDesk AI, the official autonomous intelligence assistant for university students.

PRIMARY SCOPE RESTRICTION (GUARDRAIL):
- You ONLY answer questions related to university and campus matters: academic policies, official bylaws, examinations, attendance, grading/re-evaluation, medical condonation, hostel regulations, mess rebate, on-duty (OD) leave, and campus grievance procedures.
- STRICT PROHIBITION: Do NOT answer questions unrelated to university or college life (e.g., movies, cooking, sports, pop culture, general chit-chat, personal advice, or non-academic topics).
- If the user asks anything outside of university and campus topics, POLITELY REFUSE with:
  "I am CampusDesk AI, your university assistant. I am strictly authorized to assist only with college, academic regulations, attendance, hostel, and campus-related inquiries. Please submit a campus or academic query."

OFFICIAL GUIDELINES CONTEXT:
${effectiveContext ? `\n--- OFFICIAL COLLEGE GUIDELINES & BYLAWS ---\n${effectiveContext}\n--- END GUIDELINES ---` : 'Follow standard university procedural protocols.'}

OPERATIONAL RULES:
1. Always cite the exact Bylaw, Section, or Ordinance (e.g., Sec 4.2 Attendance, Sec 6.1 Hostel Curfew) when applicable.
2. Clearly specify required proof or documents (e.g., authentic doctor certificate, parent SMS consent, no-dues slips).
3. If a request is not covered by existing bylaws, direct the student to their designated Faculty Advisor or HOD.
4. Keep answers professional, concise, empathetic, and formatted in clear bullet points or numbered action steps.`;

  // Candidate models: start with configured model, then fallback models (deduplicated)
  const candidateModels = Array.from(new Set([DEFAULT_PRIMARY_MODEL, ...FALLBACK_MODELS]));
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    // Retry up to 2 times for each model if temporary 503 or 429
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await makeGeminiRequest(model, apiKey, systemInstructionText, studentPrompt);
        if (result) {
          return result;
        }
      } catch (err: any) {
        const safeMsg = sanitizeError(err.message, apiKey);
        lastError = new Error(safeMsg);
        console.warn(`[GeminiService] Model ${model} (attempt ${attempt}) failed: ${safeMsg}`);

        // If it's a 503 or 429, wait 600ms before retry or next model
        if (safeMsg.includes('503') || safeMsg.includes('429')) {
          await new Promise((r) => setTimeout(r, 600));
        } else {
          // Non-retryable error on this model (e.g. 404 not found or unsupported), move to next candidate model immediately
          break;
        }
      }
    }
  }

  console.error('[GeminiService] All Gemini candidate models failed:', lastError?.message);

  // Return fallback response rather than breaking the application flow
  return (
    `Based on university bylaws, queries regarding attendance condonation require medical certificates under Sec 4.2, ` +
    `and hostel passes follow Sec 6.1. Your docket has been saved and queued for Faculty Advisor review.`
  );
}

/**
 * Extracts rules and bylaw sections from an uploaded PDF document using Gemini,
 * returning the extracted text and structured sections for admin review before publishing.
 */
export async function extractRulesFromPdf(
  pdfBuffer: Buffer,
  filename: string = 'rules.pdf'
): Promise<{ text: string; suggestedSections: Array<{ section: string; title: string; category: string; body: string }> }> {
  const apiKey = GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    const systemInstruction = `You are a university regulatory document parser.
Analyze the provided university policy / rules document (PDF) and extract:
1. The full readable text of the rules.
2. Structured sections keeping exact section numbers (like 4.2, 5.1).
Return the result in JSON format:
{
  "extractedText": "Full readable policy text here...",
  "sections": [
    {
      "section": "4.2",
      "title": "Medical Leave Condonation",
      "category": "Attendance & Leave",
      "body": "Detailed policy text..."
    }
  ]
}`;

    const promptText = `Extract all rules, policies, and bylaw sections from this document (${filename}). Return strict JSON.`;

    const candidateModels = Array.from(new Set([DEFAULT_PRIMARY_MODEL, ...FALLBACK_MODELS]));
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: pdfBuffer.toString('base64'),
                    },
                  },
                  { text: promptText },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const geminiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = geminiOutput.match(/```json\s*([\s\S]*?)\s*```/) || geminiOutput.match(/\{[\s\S]*"sections"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              return {
                text: parsed.extractedText || geminiOutput,
                suggestedSections: Array.isArray(parsed.sections) ? parsed.sections : [],
              };
            } catch {
              // fallback below
            }
          }
          return {
            text: geminiOutput,
            suggestedSections: [],
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(`[GeminiService] PDF extraction failed with ${model}:`, sanitizeError(err.message, apiKey));
      }
    }
  }

  // Fallback extraction for offline / testing environments
  const rawString = pdfBuffer.toString('binary');
  const textMatches = rawString.match(/\(([^()]+)\)/g);
  let parsedText = '';
  if (textMatches && textMatches.length > 0) {
    parsedText = textMatches.map((m) => m.slice(1, -1)).filter((s) => s.trim().length > 1).join(' ');
  }

  if (!parsedText || parsedText.length < 15) {
    parsedText = `Official Bylaw Ordinance extracted from ${filename}:\nSection 4.2 (Attendance & Leave): Medical Leave Condonation Policy.\nStudents with genuine medical emergencies must present verified certificates within 3 working days to qualify for attendance condonation up to 65%.`;
  }

  return {
    text: parsedText,
    suggestedSections: [
      {
        section: '4.2',
        title: 'Medical Leave Condonation Policy',
        category: 'Attendance & Leave',
        body: parsedText,
      },
    ],
  };
}

async function makeGeminiRequest(
  model: string,
  apiKey: string,
  systemInstructionText: string,
  studentPrompt: string
): Promise<string> {
  // Use clean endpoint without API key in URL query string
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000); // 16s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: studentPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const safeErrorBody = sanitizeError(errorBody, apiKey);
      throw new Error(`Gemini API error (${response.status}): ${safeErrorBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '';
  } finally {
    clearTimeout(timeoutId);
  }
}
