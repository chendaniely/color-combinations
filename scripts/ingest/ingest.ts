// CLI: regenerates data/processed/colors-data.json from data/raw/.
// Run via: npm run ingest   (or: make update-data, which re-downloads first)
import { readFileSync, writeFileSync } from 'node:fs'
import { validateDataset } from '../../src/core/validate'
import { curation } from './curation'
import type { RawFile } from './rawTypes'
import { transform } from './transform'

const raw = JSON.parse(readFileSync('data/raw/colors.json', 'utf8')) as RawFile
const retrievedOn = readFileSync('data/raw/retrieved-on.txt', 'utf8').trim()

const dataset = validateDataset(transform(raw, curation, retrievedOn))

writeFileSync('data/processed/colors-data.json', JSON.stringify(dataset, null, 1) + '\n')
console.log(
  `Wrote data/processed/colors-data.json — ${dataset.colors.length} colors, ` +
  `${dataset.combinations.length} combinations, schema v${dataset.schemaVersion}`,
)
