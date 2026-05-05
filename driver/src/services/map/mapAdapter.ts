import { FLAGS } from '../../config/flags';
import type { MapAdapter } from './map.types';
import { mapboxAdapter } from './mapboxAdapter';
import { mockMapAdapter } from './mockMapAdapter';

export const mapAdapter: MapAdapter = FLAGS.USE_MOCK_MAP ? mockMapAdapter : mapboxAdapter;

