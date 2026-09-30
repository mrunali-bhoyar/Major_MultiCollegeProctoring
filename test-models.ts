import { ai } from './src/ai/genkit';
import { z } from 'zod';

async function main() {
    try {
        const result = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: 'Hello world'
        });
        console.log('SUCCESS googleai/gemini-1.5-flash:', result.text);
    } catch (e: any) {
        console.error('FAILED googleai/gemini-1.5-flash:', e.message);
    }
}
main();
