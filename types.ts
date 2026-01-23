
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  tier: 'free' | 'pro';
  createdAt: string;
}

export interface PlagiarismSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface PlagiarismHighlight {
  text: string;
  sourceUrl: string;
  confidence: number;
}

export interface WritingIssueCounts {
  plagiarism: boolean;
  spelling: number;
  conciseness: number;
  wordChoice: number;
  grammar: number;
  punctuation: number;
  readability: boolean;
  additional: number;
}

export interface AnalysisResult {
  similarityScore: number;
  originalityScore: number;
  aiScore: number;
  wordCount: number;
  sources: PlagiarismSource[];
  highlights: PlagiarismHighlight[];
  writingFeedback: {
    grammar: string[];
    tone: string;
    readability: string;
    aiMarkers: string[];
  };
  writingScores: WritingIssueCounts;
  summary: string;
}

export interface ForensicHistoryItem {
  id: string;
  timestamp: string;
  text: string;
  result: AnalysisResult;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
