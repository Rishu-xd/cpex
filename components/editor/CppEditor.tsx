'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import type { CompilerDiagnostic } from '@/lib/compiler/types';
import type { EditorSettings, JumpTarget } from '@/types/workspace';

interface CppEditorProps {
  value: string;
  fileName: string;
  diagnostics: CompilerDiagnostic[];
  settings: EditorSettings;
  jumpTarget: JumpTarget | null;
  onChange: (nextValue: string) => void;
  onRun: () => void;
  onSave: () => void;
}

function formatCppSource(source: string, tabSize: number): string {
  const indentUnit = ' '.repeat(tabSize);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const formatted: string[] = [];
  let depth = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      formatted.push('');
      continue;
    }

    if (trimmed.startsWith('#')) {
      formatted.push(trimmed);
      continue;
    }

    const leadingClosers = trimmed.match(/^\}+/)?.[0].length ?? 0;
    const effectiveDepth = Math.max(0, depth - leadingClosers);

    const isAccessSpecifier = /^(public|private|protected)\s*:/.test(trimmed);
    const lineDepth =
      isAccessSpecifier && effectiveDepth > 0 ? effectiveDepth - 1 : effectiveDepth;

    formatted.push(`${indentUnit.repeat(lineDepth)}${trimmed}`);

    // Update brace depth outside string/char literals and line comments
    let inString = false;
    let inChar = false;
    let escaped = false;
    let delta = 0;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      const next = trimmed[i + 1];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (!inString && !inChar && ch === '/' && next === '/') {
        break;
      }
      if (!inChar && ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString && ch === "'") {
        inChar = !inChar;
        continue;
      }
      if (!inString && !inChar) {
        if (ch === '{') delta += 1;
        else if (ch === '}') delta -= 1;
      }
    }
    depth = Math.max(0, depth + delta);
  }

  return formatted.join('\n');
}

export default function CppEditor({
  value,
  fileName,
  diagnostics,
  settings,
  jumpTarget,
  onChange,
  onRun,
  onSave,
}: CppEditorProps) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const tabSizeRef = useRef(settings.tabSize);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    tabSizeRef.current = settings.tabSize;
  }, [settings.tabSize]);

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('cpex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7dd3fc' },
        { token: 'keyword.directive', foreground: 'c4b5fd' },
        { token: 'string', foreground: '86efac' },
        { token: 'number', foreground: 'fdba74' },
        { token: 'type', foreground: '93c5fd' },
        { token: 'identifier', foreground: 'e4e4e7' },
      ],
      colors: {
        'editor.background': '#0c0c0f',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#14141a',
        'editor.selectionBackground': '#264f7866',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editorGutter.background': '#0c0c0f',
        'editorCursor.foreground': '#38bdf8',
        'editorWidget.background': '#141419',
        'editorWidget.border': '#27272a',
      },
    });
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.registerDocumentFormattingEditProvider('cpp', {
      provideDocumentFormattingEdits(model: monacoEditor.editor.ITextModel) {
        const formatted = formatCppSource(model.getValue(), tabSizeRef.current);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });

    editor.addAction({
      id: 'cpex-format-cpp',
      label: 'Format C++ Document',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run();
      },
    });
  };

  // Sync Clang diagnostics to Monaco markers
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const fileDiagnostics = diagnostics.filter((d) => d.file === fileName);
    const markers: monacoEditor.editor.IMarkerData[] = fileDiagnostics.map((d) => {
      const severity =
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info;
      const lineCount = model.getLineCount();
      const clampedLine = Math.min(Math.max(1, d.line), lineCount);
      const maxCol = model.getLineMaxColumn(clampedLine);
      const clampedCol = Math.min(Math.max(1, d.column), maxCol);

      return {
        severity,
        message: d.message,
        startLineNumber: clampedLine,
        startColumn: clampedCol,
        endLineNumber: clampedLine,
        endColumn: Math.min(maxCol, clampedCol + 12),
        source: 'clang++',
      };
    });

    monaco.editor.setModelMarkers(model, 'clang', markers);
  }, [diagnostics, fileName, value]);

  // Handle jump-to-error navigation
  useEffect(() => {
    if (!jumpTarget || jumpTarget.file !== fileName) return;
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    const lineCount = model ? model.getLineCount() : jumpTarget.line;
    const line = Math.min(Math.max(1, jumpTarget.line), lineCount);
    const col = Math.max(1, jumpTarget.column);

    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: col });
    editor.focus();
  }, [jumpTarget, fileName]);

  return (
    <div className="h-full w-full bg-[#0c0c0f]">
      <Editor
        height="100%"
        language="cpp"
        path={fileName}
        value={value}
        theme="cpex-dark"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(val) => onChange(val ?? '')}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-zinc-500 font-mono">
            Initializing Monaco C++ editor...
          </div>
        }
        options={{
          fontFamily: 'var(--font-geist-mono), Consolas, monospace',
          fontSize: settings.fontSize,
          fontLigatures: true,
          tabSize: settings.tabSize,
          insertSpaces: true,
          automaticLayout: true,
          autoIndent: 'full',
          formatOnPaste: true,
          bracketPairColorization: { enabled: true },
          matchBrackets: 'always',
          minimap: { enabled: settings.minimap },
          wordWrap: settings.wordWrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderLineHighlight: 'line',
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
        }}
      />
    </div>
  );
}
