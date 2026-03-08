export type AnalysisResult = {
  riskLevel: 'Low' | 'Medium' | 'High';
  plagiarismAnalysis: string;
  aiAnalysis: string;
  plagiarismScore: number;
  aiProbabilityScore: number;
  perplexity: number;
  burstiness: number;
  similarSources: {
    url: string;
    similarityPercentage: number;
  }[];
};
