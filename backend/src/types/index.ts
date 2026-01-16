// Core data models
export interface ArticleAnalysis {
  id: string;
  url: string;
  analyzedAt: Date;

  originalContent: {
    title: string;
    text: string;
    source: string;
    author?: string;
    publishedAt?: Date;
  };

  summary: {
    text: string;
    keyFacts: string[];
    missingContext: string[];
  };

  biasIndicators: BiasIndicator[];

  perspectives?: PerspectivesResult;
  evidence?: EvidenceResult;

  isPolitical: boolean;
  cached: boolean;
}

export interface BiasIndicator {
  originalText: string;
  type: 'loaded_language' | 'unsubstantiated' | 'missing_context' | 'framing';
  explanation: string;
}

export interface PerspectivesResult {
  topic: string;
  sources: {
    name: string;
    url: string;
    title: string;
    lean: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
    snippet: string;
  }[];
  cached: boolean;
}

export interface EvidenceResult {
  topic: string;
  summary: string;
  evidenceStrength: 'strong' | 'moderate' | 'limited' | 'contested';
  studies: Study[];
  expertCommentary: ExpertQuote[];
  limitations: string;
  cached: boolean;
}

export interface Study {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  doiVerified: boolean;
  verificationNote?: string;
  finding: string;
  url: string;
}

export interface ExpertQuote {
  expert: string;
  affiliation: string;
  quote: string;
  sourceUrl: string;
}

// API Request/Response types
export interface AnalyzeRequest {
  url: string;
  content: string;
  title: string;
  source: string;
}

export interface AnalyzeResponse {
  id: string;
  summary: {
    text: string;
    key_facts: string[];
    missing_context: string[];
  };
  bias_indicators: {
    original_text: string;
    type: string;
    explanation: string;
  }[];
  is_political: boolean;
  cached: boolean;
}

export interface PerspectivesRequest {
  topic: string;
  keywords: string[];
}

export interface EvidenceRequest {
  topic: string;
  claims: string[];
}

// Chrome extension message types
export type MessageType =
  | 'ANALYZE_ARTICLE'
  | 'GET_PERSPECTIVES'
  | 'GET_EVIDENCE'
  | 'ANALYSIS_COMPLETE'
  | 'PERSPECTIVES_COMPLETE'
  | 'EVIDENCE_COMPLETE'
  | 'ERROR';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

export interface ExtractedArticle {
  url: string;
  title: string;
  content: string;
  source: string;
  author?: string;
}
