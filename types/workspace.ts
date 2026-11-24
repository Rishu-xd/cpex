import type {
  CompilerConfig,
  ExecutionResult,
  ExecutionStatus,
} from '../lib/compiler/types';
import type { GitHubTargetConfig } from '../lib/github/types';

export interface FileTab {
  name: string;
  content: string;
}

export interface TestCase {
  id: string;
  name: string;
  stdin: string;
  expectedOutput: string;
}

export interface TestCaseRunResult {
  testCaseId: string;
  passed: boolean | null;
  result: ExecutionResult;
}

export interface ExecutionRecord {
  id: string;
  timestamp: string;
  entryFile: string;
  stdinPreview: string;
  filesSnapshot: Record<string, string>;
  result: ExecutionResult;
}

export interface EditorSettings {
  fontSize: number;
  minimap: boolean;
  wordWrap: boolean;
  tabSize: 2 | 4;
}

export interface JumpTarget {
  file: string;
  line: number;
  column: number;
  nonce: number;
}

export interface WorkspaceDraft {
  experimentName: string;
  files: FileTab[];
  activeFile: string;
  entryFile: string;
  stdin: string;
  testCases: TestCase[];
  compilerConfig: CompilerConfig;
  editorSettings: EditorSettings;
  savedAt: string | null;
}

export interface ExperimentVersionMetrics {
  status: ExecutionStatus;
  compileTimeMs: number;
  executionTimeMs: number | null;
}

export interface ExperimentVersion {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: string;
  files: FileTab[];
  entryFile: string;
  stdin: string;
  testCases: TestCase[];
  metrics?: ExperimentVersionMetrics;
}

export interface Experiment {
  id: string;
  name: string;
  isTemporary: boolean;
  notes: string;
  files: FileTab[];
  activeFile: string;
  entryFile: string;
  stdin: string;
  testCases: TestCase[];
  versions: ExperimentVersion[];
  history: ExecutionRecord[];
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string | null;
  githubTarget?: GitHubTargetConfig;
}

export interface ExperimentsStoreState {
  experiments: Experiment[];
  activeExperimentId: string;
  compilerConfig: CompilerConfig;
  editorSettings: EditorSettings;
}

export interface DiffComparisonSpec {
  leftTitle: string;
  leftFiles: FileTab[];
  rightTitle: string;
  rightFiles: FileTab[];
  fileName: string;
  leftVersionId?: string;
}
