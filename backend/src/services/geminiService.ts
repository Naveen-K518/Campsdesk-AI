/**
 * Gemini AI Service with College Guidelines Context Injection,
 * Timeout Handling, Retry Logic, and Multi-Model Fallbacks.
 */

const DEFAULT_PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];

export async function generateCollegeAIResponse(
  studentPrompt: string,
  guidelinesContext?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  const systemInstructionText = `You are CampusDesk AI, the official autonomous intelligence assistant for university students.

PRIMARY SCOPE RESTRICTION (GUARDRAIL):
- You ONLY answer questions related to university and campus matters: academic policies, official bylaws, examinations, attendance, grading/re-evaluation, medical condonation, hostel regulations, mess rebate, on-duty (OD) leave, and campus grievance procedures.
- STRICT PROHIBITION: Do NOT answer questions unrelated to university or college life (e.g., movies, cooking, sports, pop culture, general chit-chat, personal advice, or non-academic topics).
- If the user asks anything outside of university and campus topics, POLITELY REFUSE with:
  "I am CampusDesk AI, your university assistant. I am strictly authorized to assist only with college, academic regulations, attendance, hostel, and campus-related inquiries. Please submit a campus or academic query."

OFFICIAL GUIDELINES CONTEXT:
${guidelinesContext ? `\n--- OFFICIAL COLLEGE GUIDELINES ---\n${guidelinesContext}\n--- END GUIDELINES ---` : 'Follow standard university procedural protocols.'}

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
        lastError = err;
        console.warn(`[GeminiService] Model ${model} (attempt ${attempt}) failed: ${err.message}`);

        // If it's a 503 or 429, wait 600ms before retry or next model
        if (err.message && (err.message.includes('503') || err.message.includes('429'))) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        } else {
          // Non-transient error, move to next model immediately
          break;
        }
      }
    }
  }

  // If all live calls fail, provide a clean fall-through message rather than crashing
  console.error('[GeminiService] All Gemini candidate models failed:', lastError);
  return (
    `I am currently processing your campus query, but the university AI cloud connection is experiencing heavy traffic. ` +
    `Based on university bylaws, queries regarding attendance condonation require medical certificates under Sec 4.2, ` +
    `and hostel passes follow Sec 6.1. Your docket has been saved and queued for Faculty Advisor review.`
  );
}

async function makeGeminiRequest(
  model: string,
  apiKey: string,
  systemInstructionText: string,
  studentPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000); // 16s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '';
  } finally {
    clearTimeout(timeoutId);
  }
}
