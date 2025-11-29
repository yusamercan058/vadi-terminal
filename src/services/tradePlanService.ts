import { JournalEntry } from '../types';

/**
 * Calculate plan deviation
 */
export const calculatePlanDeviation = (trade: JournalEntry): number => {
  if (!trade.tradePlan || !trade.actualExecution) {
    return 0;
  }

  const plan = trade.tradePlan;
  const actual = trade.actualExecution;

  // Calculate deviations
  const entryDev = Math.abs(parseFloat(actual.entry.toString()) - plan.entry) / plan.entry * 100;
  const stopDev = Math.abs(parseFloat(actual.stop.toString()) - plan.stop) / plan.stop * 100;
  const targetDev = actual.target 
    ? Math.abs(parseFloat(actual.target.toString()) - plan.target) / plan.target * 100 
    : 0;
  const lotDev = 0; // lotSize not available in current types

  // Weighted average (entry and stop are more important)
  const avgDev = (entryDev * 0.3 + stopDev * 0.3 + targetDev * 0.2 + lotDev * 0.2);

  return Math.round(avgDev * 100) / 100;
};

/**
 * Compare plan vs actual execution
 */
export const comparePlanVsActual = (trade: JournalEntry): {
  entryMatch: boolean;
  stopMatch: boolean;
  targetMatch: boolean;
  lotMatch: boolean;
  overallScore: number; // 0-100
} => {
  if (!trade.tradePlan || !trade.actualExecution) {
    return {
      entryMatch: false,
      stopMatch: false,
      targetMatch: false,
      lotMatch: false,
      overallScore: 0,
    };
  }

  const plan = trade.tradePlan;
  const actual = trade.actualExecution;
  const tolerance = 0.001; // 1 pip tolerance

  const entryMatch = Math.abs(parseFloat(actual.entry.toString()) - plan.entry) <= tolerance;
  const stopMatch = Math.abs(parseFloat(actual.stop.toString()) - plan.stop) <= tolerance;
  const targetMatch = actual.target 
    ? Math.abs(parseFloat(actual.target.toString()) - plan.target) <= tolerance 
    : false;
  const lotMatch = true; // lotSize not available in current types

  const score = (entryMatch ? 30 : 0) + 
                (stopMatch ? 30 : 0) + 
                (targetMatch ? 20 : 0) + 
                (lotMatch ? 20 : 0);

  return {
    entryMatch,
    stopMatch,
    targetMatch,
    lotMatch,
    overallScore: score,
  };
};

