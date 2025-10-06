/**
 * Size model helper utilities
 * Supports balance-percentage and fixed-notional sizing
 */

export interface SizeModel {
  type: "balance-percentage" | "fixed-notional";
  value: number;
}

export interface SizingContext {
  balance: number;
  tokenPrice: number;
}

/**
 * Calculate position size based on size model
 */
export function calculatePositionSize(
  sizeModel: SizeModel,
  context: SizingContext
): number {
  switch (sizeModel.type) {
    case "balance-percentage":
      // value is percentage (e.g., 10 = 10%)
      const notional = context.balance * (sizeModel.value / 100);
      return notional / context.tokenPrice;
      
    case "fixed-notional":
      // value is USD amount (e.g., 1000 = $1000)
      return sizeModel.value / context.tokenPrice;
      
    default:
      throw new Error(`Unknown size model type: ${(sizeModel as any).type}`);
  }
}

/**
 * Validate size model structure
 */
export function validateSizeModel(sizeModel: any): sizeModel is SizeModel {
  if (!sizeModel || typeof sizeModel !== "object") {
    return false;
  }
  
  if (!["balance-percentage", "fixed-notional"].includes(sizeModel.type)) {
    return false;
  }
  
  if (typeof sizeModel.value !== "number" || sizeModel.value <= 0) {
    return false;
  }
  
  return true;
}
