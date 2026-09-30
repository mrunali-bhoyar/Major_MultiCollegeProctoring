import { ai } from './src/ai/genkit';
import { z } from 'zod';

async function main() {
    try {
        const result = await ai.generate({
            model: 'googleai/gemini-3.5-flash',
            messages: [
                {
                    role: 'user',
                    content: [
                        { text: 'Analyze this proctoring frame. Return JSON exactly matching this schema: {"faceCount": number, "gazeConfidence": number, "gazeDirection": "NORMAL"|"AWAY"|"UNKNOWN", "detectedObjects": string[], "isSuspicious": boolean, "reason": string}' },
                    ]
                }
            ],
            output: {
                format: 'json',
                schema: z.object({
                    faceCount: z.number(),
                    gazeConfidence: z.number(),
                    gazeDirection: z.enum(['NORMAL', 'AWAY', 'UNKNOWN']),
                    detectedObjects: z.array(z.string()),
                    isSuspicious: z.boolean(),
                    reason: z.string().optional()
                })
            }
        });
        console.log('SUCCESS:', result.output);
    } catch (e: any) {
        console.error('FAILED:', e.message);
    }
}
main();
