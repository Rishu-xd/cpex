import { CPP_TEMPLATES, type CppTemplate } from '../compiler/templates';
import { DEFAULT_COMPILER_CONFIG } from '../compiler/types';
import type {
  EditorSettings,
  ExecutionRecord,
  Experiment,
  ExperimentVersion,
  ExperimentVersionMetrics,
  ExperimentsStoreState,
  FileTab,
  TestCase,
  WorkspaceDraft,
} from '../../types/workspace';

export const STORAGE_STORE_V2_KEY = 'cpex.experiments.store.v2';
export const STORAGE_DRAFT_V1_KEY = 'cpex.workspace.draft.v1';
export const STORAGE_HISTORY_V1_KEY = 'cpex.workspace.history.v1';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  minimap: false,
  wordWrap: false,
  tabSize: 4,
};

function cloneFiles(files: FileTab[]): FileTab[] {
  return files.map((f) => ({ name: f.name, content: f.content }));
}

function cloneTestCases(testCases: TestCase[]): TestCase[] {
  return testCases.map((tc) => ({
    id: tc.id,
    name: tc.name,
    stdin: tc.stdin,
    expectedOutput: tc.expectedOutput,
  }));
}

export function createInitialStoreState(): ExperimentsStoreState {
  const starter = CPP_TEMPLATES[0];
  const files: FileTab[] = Object.entries(starter.files).map(
    ([name, content]) => ({ name, content })
  );

  const starterExperiment: Experiment = {
    id: 'exp-starter',
    name: 'Vector Iteration',
    isTemporary: false,
    notes: '',
    files,
    activeFile: starter.entryFile,
    entryFile: starter.entryFile,
    stdin: starter.sampleInput,
    testCases: [
      {
        id: 'tc-1',
        name: 'Case 1',
        stdin: '',
        expectedOutput: '1 2 3 4 5 ',
      },
    ],
    versions: [],
    history: [],
    createdAt: '',
    updatedAt: '',
    lastSavedAt: null,
  };

  return {
    experiments: [starterExperiment],
    activeExperimentId: starterExperiment.id,
    compilerConfig: { ...DEFAULT_COMPILER_CONFIG },
    editorSettings: { ...DEFAULT_EDITOR_SETTINGS },
  };
}

export function createExperimentFromTemplate(
  template: CppTemplate,
  id: string,
  nowIso: string,
  isTemporary: boolean
): Experiment {
  const files: FileTab[] = Object.entries(template.files).map(
    ([name, content]) => ({ name, content })
  );
  return {
    id,
    name: template.name,
    isTemporary,
    notes: '',
    files,
    activeFile: template.entryFile,
    entryFile: template.entryFile,
    stdin: template.sampleInput,
    testCases: [
      {
        id: `${id}-tc-1`,
        name: 'Sample Input',
        stdin: template.sampleInput,
        expectedOutput: '',
      },
    ],
    versions: [],
    history: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSavedAt: isTemporary ? null : nowIso,
  };
}

export function createBlankExperiment(
  name: string,
  id: string,
  nowIso: string,
  isTemporary: boolean
): Experiment {
  return {
    id,
    name,
    isTemporary,
    notes: '',
    files: [
      {
        name: 'main.cpp',
        content: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`,
      },
    ],
    activeFile: 'main.cpp',
    entryFile: 'main.cpp',
    stdin: '',
    testCases: [
      {
        id: `${id}-tc-1`,
        name: 'Case 1',
        stdin: '',
        expectedOutput: '',
      },
    ],
    versions: [],
    history: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSavedAt: isTemporary ? null : nowIso,
  };
}

export function duplicateExperiment(
  source: Experiment,
  id: string,
  nowIso: string
): Experiment {
  const clonedFiles = cloneFiles(source.files);
  const clonedTests = cloneTestCases(source.testCases).map((tc, index) => ({
    ...tc,
    id: `${id}-tc-${index + 1}`,
  }));

  const initialVersion: ExperimentVersion = {
    id: `${id}-ver-1`,
    versionNumber: 1,
    label: 'Forked from ' + source.name,
    createdAt: nowIso,
    files: cloneFiles(clonedFiles),
    entryFile: source.entryFile,
    stdin: source.stdin,
    testCases: cloneTestCases(clonedTests),
  };

  return {
    id,
    name: `${source.name} (Copy)`,
    isTemporary: false,
    notes: source.notes,
    files: clonedFiles,
    activeFile: source.activeFile,
    entryFile: source.entryFile,
    stdin: source.stdin,
    testCases: clonedTests,
    versions: [initialVersion],
    history: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSavedAt: nowIso,
  };
}

export function addVersionSnapshot(
  exp: Experiment,
  label: string,
  versionId: string,
  nowIso: string,
  metrics?: ExperimentVersionMetrics
): Experiment {
  const maxVersion = exp.versions.reduce(
    (max, v) => (v.versionNumber > max ? v.versionNumber : max),
    0
  );
  const versionNumber = maxVersion + 1;
  const cleanLabel = label.trim() || `Snapshot v${versionNumber}`;

  const snapshot: ExperimentVersion = {
    id: versionId,
    versionNumber,
    label: cleanLabel,
    createdAt: nowIso,
    files: cloneFiles(exp.files),
    entryFile: exp.entryFile,
    stdin: exp.stdin,
    testCases: cloneTestCases(exp.testCases),
    metrics,
  };

  return {
    ...exp,
    versions: [snapshot, ...exp.versions],
    updatedAt: nowIso,
  };
}

export function restoreVersionInExperiment(
  exp: Experiment,
  versionId: string,
  backupVersionId: string,
  nowIso: string,
  autoBackup: boolean
): Experiment {
  const target = exp.versions.find((v) => v.id === versionId);
  if (!target) return exp;

  const baseExp = autoBackup
    ? addVersionSnapshot(
        exp,
        `Auto-backup before restoring v${target.versionNumber}`,
        backupVersionId,
        nowIso
      )
    : exp;

  const restoredFiles = cloneFiles(target.files);
  const nextActive = restoredFiles.some((f) => f.name === target.entryFile)
    ? target.entryFile
    : (restoredFiles[0]?.name ?? 'main.cpp');

  return {
    ...baseExp,
    files: restoredFiles,
    entryFile: target.entryFile,
    activeFile: nextActive,
    stdin: target.stdin,
    testCases: cloneTestCases(target.testCases),
    updatedAt: nowIso,
  };
}

export function migrateV1ToV2(
  rawDraft: string | null,
  rawHistory: string | null,
  nowIso: string
): ExperimentsStoreState | null {
  if (!rawDraft && !rawHistory) return null;

  const base = createInitialStoreState();
  const baseExp = base.experiments[0];

  try {
    let nextExp: Experiment = {
      ...baseExp,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastSavedAt: nowIso,
    };
    let nextCompiler = base.compilerConfig;
    let nextEditor = base.editorSettings;

    if (rawDraft) {
      const parsed = JSON.parse(rawDraft) as Partial<WorkspaceDraft>;
      const validFiles =
        Array.isArray(parsed.files) && parsed.files.length > 0
          ? parsed.files
          : baseExp.files;
      const activeFile =
        parsed.activeFile && validFiles.some((f) => f.name === parsed.activeFile)
          ? parsed.activeFile
          : validFiles[0].name;
      const entryFile =
        parsed.entryFile && validFiles.some((f) => f.name === parsed.entryFile)
          ? parsed.entryFile
          : validFiles[0].name;

      nextExp = {
        ...nextExp,
        name: parsed.experimentName || baseExp.name,
        files: cloneFiles(validFiles),
        activeFile,
        entryFile,
        stdin: typeof parsed.stdin === 'string' ? parsed.stdin : baseExp.stdin,
        testCases:
          Array.isArray(parsed.testCases) && parsed.testCases.length > 0
            ? cloneTestCases(parsed.testCases)
            : baseExp.testCases,
        lastSavedAt: parsed.savedAt ?? nowIso,
      };
      if (parsed.compilerConfig) {
        nextCompiler = { ...nextCompiler, ...parsed.compilerConfig };
      }
      if (parsed.editorSettings) {
        nextEditor = { ...nextEditor, ...parsed.editorSettings };
      }
    }

    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory) as ExecutionRecord[];
      if (Array.isArray(parsedHistory)) {
        nextExp = {
          ...nextExp,
          history: parsedHistory.slice(0, 30),
        };
      }
    }

    return {
      experiments: [nextExp],
      activeExperimentId: nextExp.id,
      compilerConfig: nextCompiler,
      editorSettings: nextEditor,
    };
  } catch {
    return null;
  }
}

export function loadStoreFromLocalStorage(): ExperimentsStoreState | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawV2 = localStorage.getItem(STORAGE_STORE_V2_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<ExperimentsStoreState>;
      if (Array.isArray(parsed.experiments) && parsed.experiments.length > 0) {
        const activeId =
          parsed.activeExperimentId &&
          parsed.experiments.some((e) => e.id === parsed.activeExperimentId)
            ? parsed.activeExperimentId
            : parsed.experiments[0].id;
        return {
          experiments: parsed.experiments,
          activeExperimentId: activeId,
          compilerConfig: {
            ...DEFAULT_COMPILER_CONFIG,
            ...(parsed.compilerConfig ?? {}),
          },
          editorSettings: {
            ...DEFAULT_EDITOR_SETTINGS,
            ...(parsed.editorSettings ?? {}),
          },
        };
      }
    }

    const rawDraft = localStorage.getItem(STORAGE_DRAFT_V1_KEY);
    const rawHistory = localStorage.getItem(STORAGE_HISTORY_V1_KEY);
    return migrateV1ToV2(rawDraft, rawHistory, new Date().toISOString());
  } catch {
    return null;
  }
}

export function saveStoreToLocalStorage(state: ExperimentsStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_STORE_V2_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
