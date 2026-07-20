// Loads the bundled processed dataset. The ONLY module that touches the
// data file; everything else goes through core queries on `dataset`.
import processed from '../data/processed/colors-data.json'
import { index, type Indexed } from './core/dataset'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(processed))
