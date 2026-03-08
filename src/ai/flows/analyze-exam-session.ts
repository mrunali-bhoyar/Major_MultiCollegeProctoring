'use server';

/**
 * @fileOverview Analyzes exam proctoring data to generate a summary and suggest interventions.
 *
 * - analyzeExamSession - A function that handles the full analysis.
 * - AnalyzeExamSessionInput - The input type for the function.
 * - AnalyzeExamSessionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeExamSessionInputSchema = z.object({
  sessionData: z.string().describe('The detailed data of the exam session, including raw events and timestamps.'),
  alerts: z.array(
    z.object({
      message: z.string(),
      type: z.enum(['info', 'warning']),
      timestamp: z.string().datetime(),
      scoreImpact: z.number(),
    })
  ).describe('A list of high-priority alerts generated during the exam session.'),
  currentSuspicionScore: z.number().min(0).max(100).describe('The final suspicion score of the exam session.'),
  studentId: z.string().describe('The ID of the student taking the exam.'),
});
export type AnalyzeExamSessionInput = z.infer<typeof AnalyzeExamSessionInputSchema>;

const AnalyzeExamSessionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key events and suspicion score fluctuations during the exam session.'),
  suggestedInterventions: z.array(
    z.string().describe('A suggested intervention based on the alerts.')
  ).describe('A list of suggested interventions for the admin.'),
});
export type AnalyzeExamSessionOutput = z.infer<typeof AnalyzeExamSessionOutputSchema>;

export async function analyzeExamSession(
  input: AnalyzeExamSessionInput
): Promise<AnalyzeExamSessionOutput> {
  return analyzeExamSessionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeExamSessionPrompt',
  input: {schema: AnalyzeExamSessionInputSchema},
  prompt: `You are an AI assistant for an online proctoring system. Your task is to analyze a student's exam session and provide a summary and actionable interventions for the administrator.

Here's the information about the exam session:
- Student ID: {{{studentId}}}
- Final Suspicion Score: {{{currentSuspicionScore}}}%

Here are the key alerts generated during the session:
{{#each alerts}}
- Time: {{{timestamp}}}, Type: {{{type}}}, Message: {{{message}}}, Score Impact: +{{{scoreImpact}}}
{{else}}
No high-priority alerts were recorded.
{{/each}}

Here is a raw log of session data:
{{{sessionData}}}

Based on ALL of the information provided, perform two tasks:
1.  **Summary**: Write a concise summary of the key events and suspicion score fluctuations, highlighting any potential issues or anomalies.
2.  **Interventions**: Suggest a list of specific, actionable interventions that the admin should consider. If the score is low and there are no major alerts, suggest that no action is needed.

Provide the final output as a valid JSON object string. Do not include any formatting like markdown '\`\`\`json' tags. The JSON object must conform to the following schema:
{
    "summary": "string",
    "suggestedInterventions": ["string"]
}
`,
});

const analyzeExamSessionFlow = ai.defineFlow(
  {
    name: 'analyzeExamSessionFlow',
    inputSchema: AnalyzeExamSessionInputSchema,
    outputSchema: AnalyzeExamSessionOutputSchema,
  },
  async input => {
    const result = await prompt(input);
    const jsonString = result.text;
    
    if (!jsonString) {
        throw new Error("The AI model returned empty text for session analysis.");
    }

    try {
        const parsedOutput = JSON.parse(jsonString) as AnalyzeExamSessionOutput;
        return parsedOutput;
    } catch (e) {
        console.error("Failed to parse JSON response from AI for session analysis:", jsonString, e);
        throw new Error("The AI model returned an invalid JSON format for session analysis.");
    }
  }
);
