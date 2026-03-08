
'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { analyzeSubmission } from '@/app/actions/analyze-submission';
import type { AnalysisResult } from '@/app/actions/types';
import ResultsDisplay from './ResultsDisplay';

export function PlagiarismChecker() {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<AnalysisResult | null>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/plain') {
            toast({
                variant: 'destructive',
                title: 'Unsupported File Type',
                description: 'Currently, only .txt files can be uploaded for analysis.',
            });
            e.target.value = ''; // Clear the file input
            return;
        }

        try {
            const fileText = await file.text();
            setText(fileText);
            toast({
                title: 'File Loaded',
                description: `Contents of ${file.name} are ready for analysis.`,
            });
        } catch (error) {
            console.error('Error reading file:', error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'There was a problem reading the content of your file.',
            });
        }
    };

    const handleAnalysis = async () => {
        if (!text.trim()) {
            toast({
                variant: 'destructive',
                title: 'Text is empty',
                description: 'Please paste some text to analyze.',
            });
            return;
        }

        setIsLoading(true);
        setReport(null);

        try {
            const result = await analyzeSubmission(text);
            setReport(result);
        } catch (error: any) {
            console.error("Plagiarism check failed:", error);
            let description = 'An unexpected error occurred during the analysis.';
            if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
                description = 'You have exceeded the request limit for the AI service. Please wait a moment and try again, or check your API plan and billing details.';
            } else if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
                description = 'The configured AI model could not be found. This can happen due to regional availability or a misconfiguration. Please try again later.';
            } else if (error.message) {
                description = error.message;
            }
            
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: description,
                duration: 9000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Analyze Text</CardTitle>
                        <CardDescription>
                            Paste text directly into the box, or upload a .txt file to begin your analysis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">Upload .txt File</Label>
                            <Input 
                                id="file-upload" 
                                type="file" 
                                accept=".txt" 
                                onChange={handleFileChange} 
                                disabled={isLoading}
                                className="file:text-primary file:font-medium"
                            />
                        </div>
                        <Textarea
                            placeholder="Or paste your text here..."
                            className="min-h-[400px] text-base"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button onClick={handleAnalysis} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2" />
                                    Analyze for Plagiarism
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:max-h-[calc(100vh-20rem)] lg:overflow-y-auto">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center h-full p-16 rounded-lg border-dashed border-2">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <p className="mt-4 text-muted-foreground">AI is analyzing the document...</p>
                        <p className="text-sm text-muted-foreground/50">This may take a moment.</p>
                    </div>
                )}
                {report && <ResultsDisplay result={report} />}
                {!isLoading && !report && (
                    <div className="flex flex-col items-center justify-center h-full p-16 rounded-lg border-dashed border-2 text-center">
                        <Search className="w-16 h-16 text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground">Your plagiarism report will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
