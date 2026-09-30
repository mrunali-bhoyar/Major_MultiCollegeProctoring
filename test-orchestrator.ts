import { ai } from './src/ai/genkit';
import { z } from 'zod';
import { OrchestratorOutputSchema } from './src/app/api/orchestrator/route';

async function main() {
    try {
        const result = await ai.generate({
            model: 'googleai/gemini-3.5-flash',
            messages: [
                {
                    role: 'user',
                    content: [
                        { text: `You are an AI Orchestrator for a proctoring system. 
You are receiving a batch of events that occurred within a short time window.
Current Suspicion Score: 0
Events: [{"type": "VISION", "description": "No face detected"}]` }
                    ]
                }
            ],
            output: {
                format: 'json',
                schema: OrchestratorOutputSchema
            }
        });
        console.log('SUCCESS:', result.output);
    } catch (e: any) {
        console.error('FAILED:', e.message);
    }
}
main();
