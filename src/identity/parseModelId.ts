// The parts a model id is written from.

import { listingSeller } from "./listingSeller";

interface ParsedModelId {
  /** Seller prefix as written in the id, or null when the id carries none. */
  seller: string | null;
  /** Model name, without the seller path and without the variant suffix. */
  model: string;
  /** Variant suffix after a colon, such as "thinking" or "free". */
  variant?: string;
}

const parseModelId = (modelId: string): ParsedModelId => {
  const afterSellerPath = modelId.slice(modelId.lastIndexOf("/") + 1);
  const colon = afterSellerPath.indexOf(":");
  const hasVariant = colon !== -1;
  return {
    seller: listingSeller(modelId),
    model: hasVariant ? afterSellerPath.slice(0, colon) : afterSellerPath,
    variant: hasVariant ? afterSellerPath.slice(colon + 1) : undefined,
  };
};

export { parseModelId };
export type { ParsedModelId };
