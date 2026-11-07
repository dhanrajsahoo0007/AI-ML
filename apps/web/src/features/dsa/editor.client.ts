import { basicSetup, EditorView } from "codemirror";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import type { Language } from "./constants";

// The code editor (CodeMirror 6), in its own chunk: the problem page imports this module only after the
// visitor interacts with the code area (plan §15.1: no editor JS in the first load). The editable area is a
// contenteditable element, which copy protection leaves alone, so typing, selecting, copying and pasting
// work inside it while the statement and editorial around it stay protected.

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
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--primary) 25%, transparent) !important",
  },
});

// Token colours as light-dark() pairs: the site sets color-scheme on :root and .dark, so the editor follows the
// theme toggle with no JavaScript. Listed before basicSetup, so these win over its default (light-only) style.
const pair = (light: string, dark: string) => `light-dark(${light}, ${dark})`;
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: pair("#7c3aed", "#c4b5fd") },
  { tag: [t.string, t.special(t.string), t.regexp], color: pair("#047857", "#6ee7b7") },
  { tag: [t.number, t.bool, t.null, t.atom], color: pair("#b45309", "#fcd34d") },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: pair("#6b7280", "#9ca3af"), fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: pair("#1d4ed8", "#93c5fd") },
  { tag: [t.className, t.definition(t.className), t.typeName], color: pair("#be123c", "#fda4af") },
  { tag: [t.self, t.special(t.variableName)], color: pair("#c2410c", "#fdba74") },
  { tag: t.invalid, color: pair("#dc2626", "#f87171") },
]);

export interface CodeEditor {
  getValue(): string;
  focus(): void;
  destroy(): void;
}

export function createEditor(options: {
  parent: HTMLElement;
  doc: string;
  language: Language;
  label: string;
  onChange(value: string): void;
}): CodeEditor {
  const view = new EditorView({
    doc: options.doc,
    parent: options.parent,
    extensions: [
      syntaxHighlighting(highlight),
      basicSetup,
      options.language === "python" ? python() : javascript(),
      indentUnit.of(options.language === "python" ? "    " : "  "),
      theme,
      EditorView.contentAttributes.of({ "aria-label": options.label, spellcheck: "false", autocapitalize: "off" }),
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
