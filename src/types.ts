export interface ReviewResult {
  bugs: {
    line: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  fixedCode: string;
  explanation: string;
}

export interface WebhookRequest {
  id: string;
  code: string;
  language: string;
  title: string;
  timestamp: string;
  status: 'pending' | 'reviewed';
  result?: ReviewResult;
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

export interface ReviewHistoryItem {
  id: string;
  code: string;
  language: string;
  timestamp: string;
  result: ReviewResult;
  toolName?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  initialCode: string;
  language: string;
  testCases: TestCase[];
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  code: string;
  status: 'Passed' | 'Failed' | 'Pending';
  results: {
    testCaseIndex: number;
    passed: boolean;
    actualOutput?: string;
    error?: string;
  }[];
  timestamp: any;
}

export type Theme = 'light' | 'dark' | 'high-contrast';
