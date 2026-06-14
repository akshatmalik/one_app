/**
 * Shared helpers for parsing JSON out of LLM responses.
 *
 * Models often wrap JSON in ```json fences or add stray prose. These helpers
 * give every AI service one consistent, fail-soft way to extract and validate
 * a response instead of each rolling its own strip/parse/try-catch.
 */

/** Strip ```json / ``` code fences and surrounding whitespace. */
export function stripJsonFences(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

/**
 * Strip fences and JSON.parse, returning `fallback` on any failure.
 * Optionally pass a `validate` guard to reject structurally-wrong responses.
 */
export function safeParseJSON<T>(raw: string, fallback: T, validate?: (value: unknown) => value is T): T {
  try {
    const parsed = JSON.parse(stripJsonFences(raw));
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Extract the first balanced JSON array/object from noisy text, or null. */
export function extractJSON<T>(raw: string, validate?: (value: unknown) => value is T): T | null {
  const stripped = stripJsonFences(raw);
  const match = stripped.match(/[[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}
