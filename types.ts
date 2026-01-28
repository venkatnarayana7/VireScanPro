
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
  readability: number;
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
  hash?: string; // SHA-512 Integrity Hash
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum HumanizationMode {
  NATURAL = "Natural",
  ACADEMIC = "Academic",
  AGGRESSIVE = "Aggressive",
  CREATIVE = "Creative"
}

export interface RewriteResult {
  humanizedText: string;
  originalAiProbability: number;
  newAiProbability: number;
  readabilityScore: number;
  keyChanges: string[];
  toneAnalysis: string;
}
