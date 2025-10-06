/**
 * Validate agent weights array
 * Must be exactly 8 elements, each between 0-100
 */
export function validateWeights(weights: number[]): { valid: boolean; error?: string } {
  if (!Array.isArray(weights)) {
    return { valid: false, error: "Weights must be an array" };
  }
  
  if (weights.length !== 8) {
    return { valid: false, error: "Weights must contain exactly 8 elements" };
  }
  
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    if (typeof weight !== "number" || !Number.isInteger(weight)) {
      return { valid: false, error: `Weight at index ${i} must be an integer` };
    }
    if (weight < 0 || weight > 100) {
      return { valid: false, error: `Weight at index ${i} must be between 0 and 100` };
    }
  }
  
  return { valid: true };
}
