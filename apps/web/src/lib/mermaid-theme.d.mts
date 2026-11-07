type Mode = "light" | "dark";
type Palette = { accent: { fill: string; text: string }; vars: Record<string, string> };

export declare const THEME_VERSION: string;
export declare const PALETTES: Record<Mode, Palette>;
export declare const FONT_FAMILY: string;
export declare function mermaidConfig(mode: Mode): Record<string, unknown>;
export declare function prepareSource(chart: string, mode: Mode): string;
