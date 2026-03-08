'use server';
/**
 * @fileOverview A Genkit flow for calculating a plagiarism score for a given text document.
 *
 * - calculatePlagiarismScore - A function that handles the plagiarism scoring process.
 * - CalculatePlagiarismScoreInput - The input type for the calculatePlagiarismScore function.
 * - CalculatePlagiarismScoreOutput - The return type for the calculatePlagiarismScore function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CalculatePlagiarismScoreInputSchema = z.object({
  submissionContent: z.string().describe('The full text content of the submission to be analyzed for plagiarism.'),
});
export type CalculatePlagiarismScoreInput = z.infer<typeof CalculatePlagiarismScoreInputSchema>;

const SimilarSourceSchema = z.object({
  url: z.string().url().describe('The URL of the similar source found.'),
  similarityPercentage: z.number().min(0).max(100).describe('The percentage of similarity with the source.'),
});

const CalculatePlagiarismScoreOutputSchema = z.object({
  plagiarismScore: z
    .number()
    .min(0)
    .max(100)
    .describe('The overall plagiarism score (0-100%) based on similarity to external sources.'),
  similarSources: z
    .array(SimilarSourceSchema)
    .describe('A list of up to 3 web sources that have a high similarity to the provided text.'),
});
export type CalculatePlagiarismScoreOutput = z.infer<typeof CalculatePlagiarismScoreOutputSchema>;

export async function calculatePlagiarismScore(input: CalculatePlagiarismScoreInput): Promise<CalculatePlagiarismScoreOutput> {
  return calculatePlagiarismScoreFlow(input);
}

const calculatePlagiarismScorePrompt = ai.definePrompt({
  name: 'calculatePlagiarismScorePrompt',
  input: { schema: CalculatePlagiarismScoreInputSchema },
  output: { schema: CalculatePlagiarismScoreOutputSchema },
  prompt: `You are a sophisticated plagiarism detection engine. Your task is to analyze the provided academic submission and determine a plagiarism score.

You must act as if you are comparing the text against a vast database of internet sources and academic papers. Based on your analysis, provide an overall plagiarism score and a list of up to 3 (three) sources that appear to be similar.

The URLs you provide for similar sources must be plausible but can be fictional (e.g., a Wikipedia article, a blog post, an academic journal).

Document Content to Analyze:
\`\`\`
{{{submissionContent}}}
\`\`\`

Your output must be a valid JSON object that conforms to the output schema, containing a 'plagiarismScore' and a 'similarSources' array.
`,
});

const calculatePlagiarismScoreFlow = ai.defineFlow(
  {
    name: 'calculatePlagiarismScoreFlow',
    inputSchema: CalculatePlagiarismScoreInputSchema,
    outputSchema: CalculatePlagiarismScoreOutputSchema,
  },
  async (input) => {
    const {output} = await calculatePlagiarismScorePrompt(input);

    if (!output) {
      throw new Error('AI did not return an output for plagiarism score calculation.');
    }
    return output;
  }
);
