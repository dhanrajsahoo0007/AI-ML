import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  LanguageSupport,
  syntaxHighlighting,
  type Language as CmLanguage,
} from "@codemirror/language";
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { Language } from "./constants";

// The code editor (CodeMirror 6), in its own chunk: the problem page imports this module only after the
// visitor interacts with the code area (plan §15.1: no editor JS in the first load). Only the pieces used are
// imported (no autocomplete, search or lint), and each language's grammar is a further chunk loaded when that
// language is first shown. The editable area is a contenteditable element, which copy protection leaves
// alone, so typing, selecting, copying and pasting work inside it while the statement around it stays
// protected.

const GRAMMARS: Record<Language, () => Promise<CmLanguage>> = {
  javascript: () => import("@codemirror/lang-javascript").then((m) => m.javascriptLanguage),
  python: () => import("@codemirror/lang-python").then((m) => m.pythonLanguage),
};

const theme = EditorView.theme({
  "&": {
    fontSize: "0.875rem",
    backgroundColor: "var(--paper)",
    color: "var(--ink)",
    minHeight: "16rem",
  },
  ".cm-scroller": { fontFamily: "var(--font-mono-code), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--ink)", padding: "0.75rem 0" },
  ".cm-gutters": { backgroundColor: "var(--paper-2)", color: "var(--muted-foreground)", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in oklab, var(--ink) 5%, transparent)" },
  "&.cm-focused": { outline: "2px solid color-mix(in oklab, var(--primary) 45%, transparent)", outlineOffset: "-2px" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)" },
});

// Token colours as light-dark() pairs: the site sets color-scheme on :root and .dark, so the editor follows the
// theme toggle with no JavaScript.
const pair = (light: string, dark: string) => `light-dark(${light}, ${dark})`;
const highlight = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword],
    color: pair("#7c3aed", "#c4b5fd"),
  },
  { tag: [t.string, t.special(t.string), t.regexp], color: pair("#047857", "#6ee7b7") },
  { tag: [t.number, t.bool, t.null, t.atom], color: pair("#b45309", "#fcd34d") },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: pair("#6b7280", "#9ca3af"), fontStyle: "italic" },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))],
    color: pair("#1d4ed8", "#93c5fd"),
  },
  { tag: [t.className, t.definition(t.className), t.typeName], color: pair("#be123c", "#fda4af") },
  { tag: [t.self, t.special(t.variableName)], color: pair("#c2410c", "#fdba74") },
  { tag: t.invalid, color: pair("#dc2626", "#f87171") },
]);

export interface CodeEditor {
  getValue(): string;
  focus(): void;
  destroy(): void;
}

export async function createEditor(options: {
  parent: HTMLElement;
  doc: string;
  language: Language;
  label: string;
  /** id of an element that explains how to leave the editor with the keyboard. */
  describedBy?: string;
  onChange(value: string): void;
  /** Called once the grammar has loaded, right before mounting; return false to cancel (resolves to null). */
  beforeMount(): boolean;
}): Promise<CodeEditor | null> {
  const grammar = await GRAMMARS[options.language]();
  if (!options.beforeMount()) return null;
  const view = new EditorView({
    doc: options.doc,
    parent: options.parent,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      bracketMatching(),
      new LanguageSupport(grammar),
      syntaxHighlighting(highlight),
      indentUnit.of(options.language === "python" ? "    " : "  "),
      // Tab indents; Escape then Tab moves focus out of the editor (CodeMirror's tab focus mode).
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      theme,
      EditorView.contentAttributes.of({
        "aria-label": options.label,
        ...(options.describedBy ? { "aria-describedby": options.describedBy } : {}),
        spellcheck: "false",
        autocapitalize: "off",
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) options.onChange(u.state.doc.toString());
      }),
    ],
  });
  return {
    getValue: () => view.state.doc.toString(),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
