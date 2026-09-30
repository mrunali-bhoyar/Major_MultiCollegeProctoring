import { ai } from './src/ai/genkit';
async function run() {
    try {
        const m = await ai.generate({
            model: 'googleai/gemini-1.5-flash-latest',
            prompt: 'hi'
        });
        console.log('WORKS', m.text);
    } catch (e: any) {
        console.error('ERROR', e.message);
    }
}
run();
