import { config } from '../config';

interface DailyCostData {
  date: string;
  totalCost: number;
}

let dailyCostData: DailyCostData = {
  date: new Date().toISOString().split('T')[0],
  totalCost: 0,
};

/**
 * Get the current date string in YYYY-MM-DD format
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensure we're tracking for the current day, reset if new day
 */
function ensureCurrentDay(): void {
  const today = getCurrentDateString();
  if (dailyCostData.date !== today) {
    console.log(`[CostTracker] New day detected. Resetting daily cost from ${dailyCostData.date} to ${today}`);
    dailyCostData = {
      date: today,
      totalCost: 0,
    };
  }
}

/**
 * Track an API cost
 * @param amount - The cost amount in dollars
 */
export function trackCost(amount: number): void {
  ensureCurrentDay();
  dailyCostData.totalCost += amount;

  const percentUsed = (dailyCostData.totalCost / config.dailyCostCap) * 100;

  console.log(`[CostTracker] Added cost: $${amount.toFixed(4)}. Daily total: $${dailyCostData.totalCost.toFixed(4)} (${percentUsed.toFixed(1)}% of cap)`);

  if (percentUsed >= 80 && percentUsed < 100) {
    console.warn(`[CostTracker] WARNING: Approaching daily cost cap! Currently at ${percentUsed.toFixed(1)}% ($${dailyCostData.totalCost.toFixed(2)} / $${config.dailyCostCap})`);
  } else if (percentUsed >= 100) {
    console.error(`[CostTracker] ALERT: Daily cost cap exceeded! Currently at ${percentUsed.toFixed(1)}% ($${dailyCostData.totalCost.toFixed(2)} / $${config.dailyCostCap})`);
  }
}

/**
 * Get the current daily cost
 * @returns The total cost for today in dollars
 */
export function getDailyCost(): number {
  ensureCurrentDay();
  return dailyCostData.totalCost;
}

/**
 * Reset the daily cost to zero
 */
export function resetDailyCost(): void {
  dailyCostData = {
    date: getCurrentDateString(),
    totalCost: 0,
  };
  console.log('[CostTracker] Daily cost has been reset');
}

/**
 * Check if we're over the daily budget
 * @returns true if daily cost exceeds the cap
 */
export function isOverBudget(): boolean {
  ensureCurrentDay();
  return dailyCostData.totalCost >= config.dailyCostCap;
}

/**
 * Get cost tracker status
 */
export function getCostStatus(): {
  date: string;
  totalCost: number;
  dailyCap: number;
  percentUsed: number;
  isOverBudget: boolean;
} {
  ensureCurrentDay();
  return {
    date: dailyCostData.date,
    totalCost: dailyCostData.totalCost,
    dailyCap: config.dailyCostCap,
    percentUsed: (dailyCostData.totalCost / config.dailyCostCap) * 100,
    isOverBudget: isOverBudget(),
  };
}
