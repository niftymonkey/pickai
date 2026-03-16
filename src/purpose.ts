/**
 * Built-in purpose profiles.
 *
 * Six profiles that work out of the box with models.dev metadata.
 * No tier architecture — just filter + weighted scoring criteria.
 */

import type { PurposeProfile } from "./types";
import {
  costEfficiency,
  contextCapacity,
  outputCapacity,
  recency,
  knowledgeFreshness,
} from "./score";

const Cheap: PurposeProfile = {
  criteria: [
    { criterion: costEfficiency, weight: 7 },
    { criterion: recency, weight: 1 },
  ],
};

const Balanced: PurposeProfile = {
  criteria: [
    { criterion: costEfficiency, weight: 1 },
    { criterion: recency, weight: 1 },
    { criterion: contextCapacity, weight: 1 },
    { criterion: outputCapacity, weight: 1 },
    { criterion: knowledgeFreshness, weight: 1 },
  ],
};

const Quality: PurposeProfile = {
  criteria: [
    { criterion: recency, weight: 5 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: outputCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const Coding: PurposeProfile = {
  filter: { toolCall: true },
  criteria: [
    { criterion: recency, weight: 4 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: contextCapacity, weight: 3 },
    { criterion: outputCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const Creative: PurposeProfile = {
  criteria: [
    { criterion: contextCapacity, weight: 4 },
    { criterion: recency, weight: 3 },
    { criterion: knowledgeFreshness, weight: 2 },
    { criterion: outputCapacity, weight: 1 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

const Reasoning: PurposeProfile = {
  filter: { reasoning: true },
  criteria: [
    { criterion: recency, weight: 5 },
    { criterion: knowledgeFreshness, weight: 3 },
    { criterion: outputCapacity, weight: 2 },
    { criterion: contextCapacity, weight: 2 },
    { criterion: costEfficiency, weight: 1 },
  ],
};

/**
 * Built-in purpose profile constants.
 *
 * Usage: `pick.recommend(Purpose.Coding, { limit: 5 })`
 */
export const Purpose = {
  /** Weights: costEfficiency(7), recency(1). */
  Cheap,
  /** Weights: costEfficiency(1), recency(1), contextCapacity(1), outputCapacity(1), knowledgeFreshness(1). */
  Balanced,
  /** Weights: recency(5), knowledgeFreshness(3), contextCapacity(2), outputCapacity(2), costEfficiency(1). */
  Quality,
  /** Requires tool calling. Weights: recency(4), knowledgeFreshness(3), contextCapacity(3), outputCapacity(2), costEfficiency(1). */
  Coding,
  /** Weights: contextCapacity(4), recency(3), knowledgeFreshness(2), outputCapacity(1), costEfficiency(1). */
  Creative,
  /** Requires reasoning capability. Weights: recency(5), knowledgeFreshness(3), outputCapacity(2), contextCapacity(2), costEfficiency(1). */
  Reasoning,
} as const;
