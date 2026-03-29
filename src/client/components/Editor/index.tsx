import { useEffect, useRef } from "react";
import MonacoEditor, { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { type ParseError } from "../Preview";

const DIAGRAM_TYPES = [
  "flowchart", "graph", "sequenceDiagram", "classDiagram",
  "stateDiagram", "stateDiagram-v2", "erDiagram", "gantt", "pie",
  "gitGraph", "mindmap", "timeline", "quadrantChart", "xychart-beta",
  "block-beta", "requirementDiagram", "journey",
  "C4Context", "C4Container", "C4Component",
];

function registerMermaidLanguage(monaco: Monaco) {
  if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "mermaid")) return;

  monaco.languages.register({ id: "mermaid" });

  monaco.languages.setMonarchTokensProvider("mermaid", {
    keywords: DIAGRAM_TYPES,
    tokenizer: {
      root: [
        [/%%.*$/, "comment"],
        [new RegExp(`^(${DIAGRAM_TYPES.join("|")})\\b`), "keyword.diagram"],
        [/\b(TB|TD|BT|RL|LR)\b/, "keyword.direction"],
        [/\b(participant|actor|activate|deactivate|note|loop|alt|else|opt|par|end)\b/, "keyword"],
        [/\b(class|interface|abstract|extends|implements|namespace)\b/, "keyword"],
        [/\b(title|section|dateFormat|axisFormat|excludes)\b/, "keyword"],
        [/\|[^|]*\|/, "string.label"],
        [/"[^"]*"/, "string"],
        [/-->|--|==|-.->|-\.-|--o|--x|<-->|o-->|x-->/, "operator"],
        [/\[[\w\s.,!?-]+\]/, "string"],
        [/\([\w\s.,!?-]+\)/, "string.paren"],
        [/\{[\w\s.,!?-]+\}/, "string.curly"],
        [/\d+(\.\d+)?/, "number"],
        [/[a-zA-Z_][\w$]*/, "identifier"],
        [/[ \t\r\n]+/, "white"],
      ],
    },
  });

  monaco.editor.defineTheme("mermaid-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword.diagram", foreground: "cba6f7", fontStyle: "bold" },
      { token: "keyword.direction", foreground: "89dceb" },
      { token: "keyword", foreground: "cba6f7" },
      { token: "comment", foreground: "6c7086", fontStyle: "italic" },
      { token: "string", foreground: "a6e3a1" },
      { token: "string.paren", foreground: "a6e3a1" },
      { token: "string.curly", foreground: "a6e3a1" },
      { token: "string.label", foreground: "f9e2af" },
      { token: "operator", foreground: "89b4fa" },
      { token: "number", foreground: "fab387" },
      { token: "identifier", foreground: "cdd6f4" },
    ],
    colors: {
      "editor.background": "#1e1e2e",
      "editor.foreground": "#cdd6f4",
      "editorLineNumber.foreground": "#45475a",
      "editorCursor.foreground": "#f5c2e7",
      "editor.selectionBackground": "#45475a",
      "editor.inactiveSelectionBackground": "#313244",
      "editorWidget.background": "#181825",
      "editorSuggestWidget.background": "#181825",
      "editorSuggestWidget.border": "#45475a",
      "editorSuggestWidget.selectedBackground": "#313244",
    },
  });

  monaco.languages.registerCompletionItemProvider("mermaid", {
    provideCompletionItems: (model: editor.ITextModel, position: { lineNumber: number; column: number }) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: DIAGRAM_TYPES.map((type) => ({
          label: type,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: type,
          range,
        })),
      };
    },
  });
}

export interface CursorPosition {
  line: number;
  col: number;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
  parseError?: ParseError | null;
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
}

export default function Editor({ value, onChange, onCursorChange, parseError, editorRef }: EditorProps) {
  const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  function handleMount(editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorInstanceRef.current = editorInstance;
    monacoRef.current = monaco;
    registerMermaidLanguage(monaco);
    monaco.editor.setTheme("mermaid-dark");

    if (onCursorChange) {
      editorInstance.onDidChangeCursorPosition((e) => {
        onCursorChange({ line: e.position.lineNumber, col: e.position.column });
      });
    }

    // Expose editor instance to parent for jump-to-line
    if (editorRef) editorRef.current = editorInstance;
  }

  // Update Monaco markers when parseError changes
  useEffect(() => {
    const editorInst = editorInstanceRef.current;
    const monacoInst = monacoRef.current;
    if (!editorInst || !monacoInst) return;
    const model = editorInst.getModel();
    if (!model) return;

    if (parseError) {
      monacoInst.editor.setModelMarkers(model, "mermaid", [{
        startLineNumber: parseError.line,
        startColumn: parseError.column,
        endLineNumber: parseError.line,
        endColumn: model.getLineMaxColumn(parseError.line),
        message: parseError.message,
        severity: monacoInst.MarkerSeverity.Error,
      }]);
    } else {
      monacoInst.editor.setModelMarkers(model, "mermaid", []);
    }
  }, [parseError]);

  return (
    <MonacoEditor
      height="100%"
      language="mermaid"
      value={value}
      theme="mermaid-dark"
      onMount={handleMount}
      onChange={(v) => onChange(v ?? "")}
      options={{
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "JetBrains Mono, Fira Code, ui-monospace, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: "gutter",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        padding: { top: 8 },
      }}
    />
  );
}
