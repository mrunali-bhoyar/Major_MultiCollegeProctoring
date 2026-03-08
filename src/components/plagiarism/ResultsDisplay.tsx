
'use client'

import type { AnalysisResult } from '@/app/actions/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CircularProgress from './circular-progress';
import HighlightedText from './highlighted-text';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2 } from 'lucide-react';

const getRiskConfig = (riskLevel: AnalysisResult['riskLevel']) => {
  switch (riskLevel) {
    case 'High':
      return { text: 'High Risk', className: 'bg-destructive/80 text-destructive-foreground border-destructive' };
    case 'Medium':
      return { text: 'Medium Risk', className: 'bg-yellow-500/80 text-white border-yellow-500' };
    case 'Low':
      return { text: 'Low Risk', className: 'bg-green-600/80 text-white border-green-500' };
  }
};

export default function ResultsDisplay({ result }: { result: AnalysisResult }) {
  const riskConfig = getRiskConfig(result.riskLevel);
  
  return (
    <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">Analysis Report</CardTitle>
            <Badge className={cn("text-base px-4 py-1", riskConfig.className)}>{riskConfig.text}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <CircularProgress value={result.plagiarismScore} label="Plagiarism Score" color="primary" />
          <CircularProgress value={result.aiProbabilityScore} label="AI Probability" color="accent" />
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card/30">
            <p className="text-3xl font-bold">{result.perplexity.toFixed(2)}</p>
            <p className="font-semibold">Perplexity</p>
            <p className="text-xs text-foreground/60">Lower suggests AI</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card/30">
            <p className="text-3xl font-bold">{result.burstiness.toFixed(2)}</p>
            <p className="font-semibold">Burstiness</p>
            <p className="text-xs text-foreground/60">Lower suggests AI</p>
          </div>
        </div>

        <Tabs defaultValue="plagiarism" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card/50">
                <TabsTrigger value="plagiarism">Plagiarism Analysis</TabsTrigger>
                <TabsTrigger value="ai">AI Content Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="plagiarism" className="mt-4 p-4 rounded-lg bg-card/30 border border-border/30 max-h-[400px] overflow-y-auto">
                <HighlightedText text={result.plagiarismAnalysis} type="plagiarism" />
            </TabsContent>
            <TabsContent value="ai" className="mt-4 p-4 rounded-lg bg-card/30 border border-border/30 max-h-[400px] overflow-y-auto">
                <HighlightedText text={result.aiAnalysis} type="ai" />
            </TabsContent>
        </Tabs>

        {result.similarSources && result.similarSources.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Similar Sources Found
            </h4>
            <div className="space-y-2">
              {result.similarSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card/30 text-sm">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline pr-4">
                    {source.url}
                  </a>
                  <Badge variant="secondary">{source.similarityPercentage}% Match</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
