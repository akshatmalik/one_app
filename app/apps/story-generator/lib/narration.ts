// Markdown-lite parser for narration. The GM writes short paragraphs with
// **bold** and *italic* emphasis; we pre-parse into segments so the
// typewriter can reveal by character count without ever rendering a
// half-open `**` marker.

export interface NarrationSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface NarrationParagraph {
  segments: NarrationSegment[];
  /** Paragraphs that open with a quote render as spoken dialogue. */
  isDialogue: boolean;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

function parseParagraph(text: string): NarrationParagraph {
  const segments: NarrationSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ text: text.slice(last, idx), bold: false, italic: false });
    const tok = m[0];
    if (tok.startsWith('**')) segments.push({ text: tok.slice(2, -2), bold: true, italic: false });
    else segments.push({ text: tok.slice(1, -1), bold: false, italic: true });
    last = idx + tok.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false, italic: false });
  const first = text.trimStart()[0];
  return { segments, isDialogue: first === '"' || first === '“' || first === '‘' || first === "'" };
}

export function parseNarration(text: string): NarrationParagraph[] {
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(parseParagraph);
}

/** Total visible characters across all paragraphs (typewriter budget). */
export function narrationLength(paragraphs: NarrationParagraph[]): number {
  return paragraphs.reduce((sum, p) => sum + p.segments.reduce((s, seg) => s + seg.text.length, 0), 0);
}
