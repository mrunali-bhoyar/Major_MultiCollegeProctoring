import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-exam-session.ts';
import '@/ai/flows/detect-ai-content-flow.ts';
import '@/ai/flows/analyze-submission-with-llm-flow.ts';
import '@/ai/flows/calculate-plagiarism-score-flow.ts';
