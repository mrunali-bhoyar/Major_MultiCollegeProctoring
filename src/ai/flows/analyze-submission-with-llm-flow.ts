'use server';
/**
 * @fileOverview A Genkit flow for analyzing academic submissions using an LLM to assess
 * plagiarism and AI generation, provide a risk level, and highlight suspicious areas.
 *
 * - analyzeSubmissionWithLLM - A function that handles the submission analysis process.
 * - AnalyzeSubmissionWithLLMInput - The input type for the analyzeSubmissionWithLLM function.
 * - AnalyzeSubmissionWithLLMOutput - The return type for the analyzeSubmissionWithLLM function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimilarSourceSchema = z.object({
  url: z.string().url().describe('The URL of the similar source found.'),
  similarityPercentage: z.number().min(0).max(100).describe('The percentage of similarity with the source.'),
});

const AnalyzeSubmissionWithLLMInputSchema = z.object({
  submissionContent: z.string().describe('The full text content of the academic submission.'),
  plagiarismScore: z.number().min(0).max(100).describe('The pre-calculated plagiarism percentage.'),
  aiProbabilityScore: z.number().min(0).max(100).describe('The pre-calculated probability of AI-generated content.'),
  similarSources: z.array(SimilarSourceSchema).describe('A list of sources with high similarity.').optional(),
});
export type AnalyzeSubmissionWithLLMInput = z.infer<typeof AnalyzeSubmissionWithLLMInputSchema>;

const AnalyzeSubmissionWithLLMOutputSchema = z.object({
  riskLevel: z.union([z.literal('Low'), z.literal('Medium'), z.literal('High')]).describe('The overall academic integrity risk level.'),
  plagiarismAnalysis: z.string().describe('Detailed LLM analysis of plagiarism, with suspicious sections highlighted using <<PLAGIARISM_START>>...<<PLAGIARISM_END>> tags.'),
  aiAnalysis: z.string().describe('Detailed LLM analysis of AI content, with suspicious sections highlighted using <<AI_START>>...<<AI_END>> tags.'),
});
export type AnalyzeSubmissionWithLLMOutput = z.infer<typeof AnalyzeSubmissionWithLLMOutputSchema>;

export async function analyzeSubmissionWithLLM(input: AnalyzeSubmissionWithLLMInput): Promise<AnalyzeSubmissionWithLLMOutput> {
  return analyzeSubmissionWithLLMFlow(input);
}

// Helper function to determine risk level based on project requirements.
function calculateRiskLevel(plagiarismScore: number, aiProbabilityScore: number): 'Low' | 'Medium' | 'High' {
  if (plagiarismScore > 60 || aiProbabilityScore > 70) {
    return 'High';
  } else if ((plagiarismScore >= 30 && plagiarismScore <= 60) || (aiProbabilityScore >= 30 && aiProbabilityScore <= 70)) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

// Define a schema for the prompt's input, which includes the calculated risk level.
const PromptInputSchema = z.object({
  submissionContent: AnalyzeSubmissionWithLLMInputSchema.shape.submissionContent,
  plagiarismScore: AnalyzeSubmissionWithLLMInputSchema.shape.plagiarismScore,
  aiProbabilityScore: AnalyzeSubmissionWithLLMInputSchema.shape.aiProbabilityScore,
  similarSources: AnalyzeSubmissionWithLLMInputSchema.shape.similarSources,
  riskLevel: AnalyzeSubmissionWithLLMOutputSchema.shape.riskLevel,
});

const prompt = ai.definePrompt({
  name: 'analyzeSubmissionWithLLMPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: AnalyzeSubmissionWithLLMOutputSchema},
  prompt: `You are an expert academic integrity intelligence network. Your task is to analyze a student's submission for potential plagiarism and AI-generated content.
You will be provided with the submission content, a plagiarism score, an AI-generated probability score, a list of similar sources found, and the calculated risk level.
Your analysis should be thorough, explainable, and identify specific suspicious sections within the text.

The system has determined the overall academic integrity risk level for this submission as: {{{riskLevel}}}.
You must ensure your output for 'riskLevel' matches this determination.

Submission Content:
\`\`\`
{{{submissionContent}}}
\`\`\`

Analysis Data:
- Plagiarism Score: {{{plagiarismScore}}}%
- AI Probability Score: {{{aiProbabilityScore}}}%
{{#if similarSources.length}}
- Potentially Similar Sources:
{{#each similarSources}}
  - {{{this.url}}} ({{this.similarityPercentage}}% similar)
{{/each}}
{{/if}}

Provide your analysis in the following structured format. For any sections you identify as suspicious for plagiarism (especially considering the provided sources), wrap them with <<PLAGIARISM_START>> and <<PLAGIARISM_END>> tags. For any sections identified as suspicious for AI-generated content, wrap them with <<AI_START>> and <<AI_END>> tags. Do not overlap tags.

Your plagiarism analysis should explicitly mention why the text is considered plagiarized, referencing the similar sources if they were provided.

Your output JSON must contain the following fields:
- \`riskLevel\`: A string ("Low", "Medium", or "High") matching the system's determined risk level.
- \`plagiarismAnalysis\`: A string explaining the plagiarism assessment and highlighting suspicious sections with tags.
- \`aiAnalysis\`: A string explaining the AI content assessment and highlighting suspicious sections with tags.
`,
});

const analyzeSubmissionWithLLMFlow = ai.defineFlow(
  {
    name: 'analyzeSubmissionWithLLMFlow',
    inputSchema: AnalyzeSubmissionWithLLMInputSchema,
    outputSchema: AnalyzeSubmissionWithLLMOutputSchema,
  },
  async (input) => {
    const riskLevel = calculateRiskLevel(input.plagiarismScore, input.aiProbabilityScore);

    const {output} = await prompt({
      ...input,
      riskLevel: riskLevel, // Pass the calculated risk level to the prompt function
    });

    if (!output) {
      throw new Error('LLM did not return an output.');
    }

    // The LLM is instructed to return the calculated riskLevel, so we can directly return its output.
    return output;
  }
);
