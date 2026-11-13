const fold = (char: string) => char.toLowerCase()
  .replace(/[‘’`´]/, "'").replace(/[“”«»]/, '"').replace(/[‐-―−]/, '-')

// Index of every non-space, non-ellipsis character, folded for loose comparison.
function squash(text: string) {
  const chars: string[] = [], at: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (/\s|…/.test(char)) continue
    chars.push(fold(char)); at.push(i)
  }
  return { text: chars.join(''), at }
}

/** Finds `quote` in `text` at or after offset `from`, ignoring spacing, case, quote/dash styles and "..." gaps; returns offsets into `text`. */
export function findQuote(text: string, quote: string, from = 0): { start: number; end: number } | null {
  const hay = squash(text)
  const parts = quote.split(/\.{3}|…/).map(part => squash(part.trim()).text.replace(/^[.,;:!?'"]+|[.,;:!?'"]+$/g, '')).filter(Boolean)
  if (!parts.length) return null
  let cursor = hay.at.findIndex(at => at >= from), start = -1, end = -1
  if (cursor < 0) return null
  for (const part of parts) {
    const index = hay.text.indexOf(part, cursor)
    if (index < 0) return null
    if (start < 0) start = index
    end = index + part.length
    cursor = end
  }
  return { start: hay.at[start]!, end: hay.at[end - 1]! + 1 }
}
