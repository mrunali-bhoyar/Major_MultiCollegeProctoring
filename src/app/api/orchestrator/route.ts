import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EventSchema = z.object({
  type: z.string(),
  description: z.string(),
  timestamp: z.string(),
});

const OrchestratorInputSchema = z.object({
  events: z.array(EventSchema),
  currentScore: z.number(),
});

export const OrchestratorOutputSchema = z.object({
  scoreImpact: z.number().describe('The number of points to add to the suspicion score (0 to 100).'),
  message: z.string().describe('A concise alert message describing the fused reasoning (e.g., "Multiple faces and talking detected").'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('The overall risk level based on the current events and history.'),
  actionTaken: z.enum(['CONTINUE', 'WARNING', 'CREATE_ALERT', 'NOTIFY_FACULTY', 'ESCALATE', 'TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS']).describe('The action the supervisor agent decides to take.'),
  reasoningSummary: z.string().describe('A short summary of why this decision was made.'),
});

const evaluateEventsFlow = ai.defineFlow({
    name: 'evaluateEventsFlow',
    inputSchema: OrchestratorInputSchema,
    outputSchema: OrchestratorOutputSchema,
  },
  async (input) => {
    // If no events, return 0
    if (input.events.length === 0) {
      return { scoreImpact: 0, message: 'No suspicious events.', riskLevel: 'LOW' as const, actionTaken: 'CONTINUE' as const, reasoningSummary: 'No events detected' };
    }

    let result;
    try {
        result = await ai.generate({
          prompt: `You are an AI Orchestrator for a proctoring system. 
You are receiving a batch of events that occurred within a short time window.
Current Suspicion Score: ${input.currentScore}

Events:
${JSON.stringify(input.events, null, 2)}

Analyze these events. If they are related (e.g., looking away AND talking), they might compound the suspicion.
Determine the combined score impact (0 to 100), the risk level, the action to take, and provide a single concise alert message and reasoning summary.
Available actions:
- CONTINUE: Just record the event, no major action.
- WARNING: Issue a warning to the student on their screen.
- CREATE_ALERT: Flag for review in the dashboard but do not interrupt the exam yet.
- NOTIFY_FACULTY: Requires immediate attention from the Faculty (high risk).
- ESCALATE: Escalate to College Admin (critical risk).
- TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS: Only use if there is egregious and repeated cheating. Do NOT terminate an exam simply because one detection occurs.

Respond strictly with a JSON object containing EXACTLY these keys and no others:
{
  "scoreImpact": <number 0-100>,
  "message": "<string>",
  "actionTaken": "<CONTINUE|WARNING|CREATE_ALERT|NOTIFY_FACULTY|ESCALATE|TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS>",
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reasoningSummary": "<string>"
}
Do NOT wrap the response in markdown blocks. Return raw JSON.`,
          model: 'googleai/gemini-flash-latest',
          output: {
            format: 'json',
            schema: OrchestratorOutputSchema
          }
        });
    } catch (genError: any) {
        if (genError.message && (genError.message.includes('503') || genError.message.includes('429'))) {
            console.log("[ORCHESTRATOR] Retrying with fallback model gemini-3.8-flash...");
            result = await ai.generate({
              prompt: `You are an AI Orchestrator for a proctoring system. 
You are receiving a batch of events that occurred within a short time window.
Current Suspicion Score: ${input.currentScore}

Events:
${JSON.stringify(input.events, null, 2)}

Analyze these events. If they are related (e.g., looking away AND talking), they might compound the suspicion.
Determine the combined score impact (0 to 100), the risk level, the action to take, and provide a single concise alert message and reasoning summary.
Available actions:
- CONTINUE: Just record the event, no major action.
- WARNING: Issue a warning to the student on their screen.
- CREATE_ALERT: Flag for review in the dashboard but do not interrupt the exam yet.
- NOTIFY_FACULTY: Requires immediate attention from the Faculty (high risk).
- ESCALATE: Escalate to College Admin (critical risk).
- TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS: Only use if there is egregious and repeated cheating. Do NOT terminate an exam simply because one detection occurs.

Respond strictly with a JSON object containing EXACTLY these keys and no others:
{
  "scoreImpact": <number 0-100>,
  "message": "<string>",
  "actionTaken": "<CONTINUE|WARNING|CREATE_ALERT|NOTIFY_FACULTY|ESCALATE|TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS>",
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "reasoningSummary": "<string>"
}
Do NOT wrap the response in markdown blocks. Return raw JSON.`,
              model: 'googleai/gemini-3.8-flash',
              output: {
                format: 'json',
                schema: OrchestratorOutputSchema
              }
            });
        } else {
            throw genError;
        }
    }

    try {
       const parsed = result.output as any;
       return {
           scoreImpact: parsed?.scoreImpact ?? parsed?.updated_suspicion_score ?? parsed?.penalty ?? 0,
           message: parsed?.message ?? parsed?.description ?? parsed?.reasoning ?? "Suspicious activity detected.",
           actionTaken: parsed?.actionTaken ?? (parsed?.status === 'FLAGGED' ? 'CREATE_ALERT' : 'CONTINUE'),
           riskLevel: parsed?.riskLevel ?? parsed?.severity ?? "MEDIUM",
           reasoningSummary: parsed?.reasoningSummary ?? parsed?.reasoning ?? parsed?.orchestrator_notes ?? "Fallback parsing applied."
       };
    } catch (e) {
       console.error("Failed to parse", e);
       return { scoreImpact: 20, message: "Suspicious activity recorded.", riskLevel: 'MEDIUM' as const, actionTaken: 'CREATE_ALERT' as const, reasoningSummary: 'Fallback due to AI format error' };
    }
  }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { events, currentScore } = body;

    if (!Array.isArray(events) || typeof currentScore !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = await evaluateEventsFlow({ events, currentScore });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    let status = 500;
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('Quota exceeded')) status = 429;
    else if (msg.includes('503')) status = 503;
    else if (msg.includes('404')) status = 404;
    return NextResponse.json({ error: msg || 'Internal server error' }, { status });
  }
}
