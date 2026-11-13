import test from 'node:test'
import assert from 'node:assert/strict'
import { findQuote } from '../shared/find-quote.ts'

const text = 'A rich soup.Imported from batch 3 — review quantities before publishing.EgusiPalm oil'
const slice = (q: string) => { const span = findQuote(text, q); return span && text.slice(span.start, span.end) }

test('finds exact quotes', () => assert.equal(slice('review quantities'), 'review quantities'))
test('ignores case, spacing and dash style', () => assert.equal(slice('imported from  batch 3 - Review'), 'Imported from batch 3 — review'))
test('matches across list items the preview joins without spaces', () => assert.equal(slice('Egusi Palm oil'), 'EgusiPalm oil'))
test('spans an ellipsis gap and drops edge punctuation', () => assert.equal(slice('"Imported from … publishing."'), 'Imported from batch 3 — review quantities before publishing'))
test('returns null when absent', () => assert.equal(findQuote(text, 'stockfish'), null))
test('searches from an offset so a quote lands in the right field', () => assert.equal(findQuote('egusi soup. Egusi', 'Egusi', 5)?.start, 12))
