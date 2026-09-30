import { NextRequest, NextResponse } from 'next/server';
import { analyzeProctoringFrameFlow } from '@/ai/flows/analyze-proctoring-frame-flow';

export async function POST(req: NextRequest) {
    try {
        const { imagePart } = await req.json();

        if (!imagePart) {
            return NextResponse.json({ error: 'Missing imagePart' }, { status: 400 });
        }

        const result = await analyzeProctoringFrameFlow(
            { imagePart },
            {
                // Optionally pass auth here if needed for Genkit auth policies
            }
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[PROCTORING] AI analysis failed:", error);
        let status = 500;
        const msg = error.message || '';
        if (msg.includes('429') || msg.includes('Quota exceeded')) status = 429;
        else if (msg.includes('503')) status = 503;
        else if (msg.includes('404')) status = 404;
        
        return NextResponse.json({ error: msg || 'Internal Server Error' }, { status });
    }
}
