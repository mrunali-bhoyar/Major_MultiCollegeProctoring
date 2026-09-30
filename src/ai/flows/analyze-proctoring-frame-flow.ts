import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const analyzeProctoringFrameFlow = ai.defineFlow(
    {
        name: 'analyzeProctoringFrameFlow',
        inputSchema: z.object({
            imagePart: z.string(), // base64 data URL
        }),
        outputSchema: z.object({
            faceCount: z.number(),
            gazeConfidence: z.number(),
            gazeDirection: z.enum(['NORMAL', 'AWAY', 'UNKNOWN']),
            detectedObjects: z.array(z.string()),
            isSuspicious: z.boolean(),
            reason: z.string().optional()
        })
    },
    async (input) => {
        try {
            const result = await ai.generate({
                model: 'googleai/gemini-flash-latest',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { text: 'Analyze this webcam frame from a student taking an online exam. You are a proctoring AI. Respond with JSON.' },
                            { text: 'Identify the number of distinct human faces visible (faceCount).' },
                            { text: 'Identify if the primary student is looking directly at the screen (gazeDirection: NORMAL) or looking away/off-screen (gazeDirection: AWAY), or UNKNOWN. Provide a gazeConfidence score between 0 and 100.' },
                            { text: 'Identify any visible unauthorized objects like cell phones, smartphones, tablets, textbooks, notebooks, smartwatches, or other people. List them in detectedObjects.' },
                            { text: 'Set isSuspicious to true if there is 0 faces, >1 faces, gaze is AWAY, or unauthorized objects are detected.' },
                            { text: 'Respond strictly with a JSON object containing EXACTLY these keys: faceCount (number), gazeConfidence (number 0-1), gazeDirection ("NORMAL"|"AWAY"|"UNKNOWN"), detectedObjects (array of strings), isSuspicious (boolean), reason (string). Do not add any other keys.' },
                            { media: { url: input.imagePart } }
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

            return result.output || {
                faceCount: 0,
                gazeConfidence: 0,
                gazeDirection: 'UNKNOWN',
                detectedObjects: [],
                isSuspicious: false,
                reason: 'Failed to parse AI output'
            };
        } catch (error: any) {
            console.error("[PROCTORING] First AI attempt failed:", error.message);
            if (error.message.includes('503') || error.message.includes('429') || error.message.includes('404')) {
                console.log("[PROCTORING] Retrying with fallback model gemini-3.8-flash...");
                try {
                    const result = await ai.generate({
                        model: 'googleai/gemini-3.8-flash',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { text: `Analyze this proctoring frame. Timestamp: ${input.timestamp}` },
                                    { text: `Audio transcription: ${input.audioTranscription || 'None'}` },
                                    { media: { url: input.imageBytes, contentType: 'image/jpeg' } },
                                ],
                            },
                        ],
                        output: {
                            format: 'json',
                            schema: AnalysisOutputSchema
                        }
                    });
                    if (!result.output) throw new Error("Fallback AI returned empty output");
                    return result.output as any;
                } catch (fallbackError: any) {
                    console.error("[PROCTORING] Fallback AI analysis failed:", fallbackError);
                    throw new Error(`AI analysis failed: ${fallbackError.message}`);
                }
            } else {
                throw new Error(`AI analysis failed: ${error.message}`);
            }
        }
    }
);
