/**
 * Risk management utilities for stop-loss and take-profit
 */

export interface RiskModel {
  stopLoss?: {
    type: "percentage" | "fixed";
    value: number;
  };
  takeProfit?: {
    type: "percentage" | "fixed";
    value: number;
  };
  trailing?: {
    enabled: boolean;
    activationPct?: number;
    trailingPct?: number;
  };
}

/**
 * Calculate stop-loss price
 */
export function calculateStopLoss(
  entryPrice: number,
  side: "LONG" | "SHORT",
  stopLoss: RiskModel["stopLoss"]
): number | null {
  if (!stopLoss) return null;
  
  if (stopLoss.type === "percentage") {
    if (side === "LONG") {
      return entryPrice * (1 - stopLoss.value / 100);
    } else {
      return entryPrice * (1 + stopLoss.value / 100);
    }
  } else {
    // fixed price
    return stopLoss.value;
  }
}

/**
 * Calculate take-profit price
 */
export function calculateTakeProfit(
  entryPrice: number,
  side: "LONG" | "SHORT",
  takeProfit: RiskModel["takeProfit"]
): number | null {
  if (!takeProfit) return null;
  
  if (takeProfit.type === "percentage") {
    if (side === "LONG") {
      return entryPrice * (1 + takeProfit.value / 100);
    } else {
      return entryPrice * (1 - takeProfit.value / 100);
    }
  } else {
    // fixed price
    return takeProfit.value;
  }
}

/**
 * Check if position should be closed due to SL/TP
 */
export function shouldClosePosition(
  currentPrice: number,
  entryPrice: number,
  side: "LONG" | "SHORT",
  stopLoss: number | null,
  takeProfit: number | null,
  trailingStopLoss: number | null = null
): { shouldClose: boolean; reason?: string; exitPrice?: number } {
  const effectiveStopLoss = trailingStopLoss || stopLoss;
  
  if (side === "LONG") {
    if (effectiveStopLoss && currentPrice <= effectiveStopLoss) {
      return { shouldClose: true, reason: "stop-loss", exitPrice: effectiveStopLoss };
    }
    if (takeProfit && currentPrice >= takeProfit) {
      return { shouldClose: true, reason: "take-profit", exitPrice: takeProfit };
    }
  } else {
    // SHORT
    if (effectiveStopLoss && currentPrice >= effectiveStopLoss) {
      return { shouldClose: true, reason: "stop-loss", exitPrice: effectiveStopLoss };
    }
    if (takeProfit && currentPrice <= takeProfit) {
      return { shouldClose: true, reason: "take-profit", exitPrice: takeProfit };
    }
  }
  
  return { shouldClose: false };
}

/**
 * Update trailing stop-loss if conditions are met
 */
export function updateTrailingStopLoss(
  entryPrice: number,
  currentPrice: number,
  side: "LONG" | "SHORT",
  currentTrailingStopLoss: number | null,
  trailingConfig: RiskModel["trailing"]
): number | null {
  if (!trailingConfig || !trailingConfig.enabled) {
    return currentTrailingStopLoss;
  }
  
  const activationPct = trailingConfig.activationPct || 5;
  const trailingPct = trailingConfig.trailingPct || 3;
  
  if (side === "LONG") {
    const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitPct < activationPct) {
      return currentTrailingStopLoss;
    }
    
    const newTrailingStopLoss = currentPrice * (1 - trailingPct / 100);
    
    if (!currentTrailingStopLoss || newTrailingStopLoss > currentTrailingStopLoss) {
      return newTrailingStopLoss;
    }
  } else {
    // SHORT
    const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
    
    if (profitPct < activationPct) {
      return currentTrailingStopLoss;
    }
    
    const newTrailingStopLoss = currentPrice * (1 + trailingPct / 100);
    
    if (!currentTrailingStopLoss || newTrailingStopLoss < currentTrailingStopLoss) {
      return newTrailingStopLoss;
    }
  }
  
  return currentTrailingStopLoss;
}

/**
 * Validate risk model structure
 */
export function validateRiskModel(riskModel: any): riskModel is RiskModel {
  if (!riskModel || typeof riskModel !== "object") {
    return true; // Risk model is optional
  }
  
  if (riskModel.stopLoss) {
    if (!["percentage", "fixed"].includes(riskModel.stopLoss.type)) {
      return false;
    }
    if (typeof riskModel.stopLoss.value !== "number") {
      return false;
    }
  }
  
  if (riskModel.takeProfit) {
    if (!["percentage", "fixed"].includes(riskModel.takeProfit.type)) {
      return false;
    }
    if (typeof riskModel.takeProfit.value !== "number") {
      return false;
    }
  }
  
  return true;
}
