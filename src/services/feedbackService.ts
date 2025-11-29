import { ZoneFeedback, UserAccuracyMetrics, AILearningData, SMCZone, MarketBias } from '../types';

const STORAGE_KEY = 'smc_zone_feedbacks';
const LEARNING_DATA_KEY = 'smc_ai_learning_data';

/**
 * Save zone feedback
 */
export const saveZoneFeedback = (feedback: ZoneFeedback): void => {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const updated = [...existing.filter((f: ZoneFeedback) => f.zoneId !== feedback.zoneId), feedback];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

/**
 * Get feedback for a zone
 */
export const getZoneFeedback = (zoneId: string): ZoneFeedback | null => {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return existing.find((f: ZoneFeedback) => f.zoneId === zoneId) || null;
};

/**
 * Get all feedbacks
 */
export const getAllFeedbacks = (): ZoneFeedback[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
};

/**
 * Calculate user accuracy metrics
 */
export const calculateUserAccuracyMetrics = (): UserAccuracyMetrics => {
  const feedbacks = getAllFeedbacks();
  
  if (feedbacks.length === 0) {
    return {
      totalFeedbacks: 0,
      correctPredictions: 0,
      incorrectPredictions: 0,
      partialPredictions: 0,
      overallAccuracy: 0,
      accuracyByZoneType: {},
      accuracyByScore: {},
      recentAccuracy: 0,
      improvementTrend: 'STABLE',
    };
  }

  const correct = feedbacks.filter(f => f.accuracy === 'CORRECT').length;
  const incorrect = feedbacks.filter(f => f.accuracy === 'INCORRECT').length;
  const partial = feedbacks.filter(f => f.accuracy === 'PARTIAL').length;
  const overallAccuracy = feedbacks.length > 0 ? (correct / feedbacks.length) * 100 : 0;

  // Accuracy by zone type
  const accuracyByZoneType: Record<string, { correct: number; total: number }> = {};
  feedbacks.forEach(f => {
    // We need zone type from feedback, but we don't have it stored
    // This would need to be enhanced to store zone type in feedback
    const type = 'Unknown'; // Placeholder
    if (!accuracyByZoneType[type]) {
      accuracyByZoneType[type] = { correct: 0, total: 0 };
    }
    accuracyByZoneType[type].total++;
    if (f.accuracy === 'CORRECT') accuracyByZoneType[type].correct++;
  });

  const accuracyByZoneTypePercent: Record<string, number> = {};
  Object.entries(accuracyByZoneType).forEach(([type, data]) => {
    accuracyByZoneTypePercent[type] = data.total > 0 ? (data.correct / data.total) * 100 : 0;
  });

  // Accuracy by score range
  const accuracyByScore: Record<string, { correct: number; total: number }> = {};
  // This would need zone score stored in feedback
  const accuracyByScorePercent: Record<string, number> = {};

  // Recent accuracy (last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentFeedbacks = feedbacks.filter(f => f.timestamp >= thirtyDaysAgo);
  const recentCorrect = recentFeedbacks.filter(f => f.accuracy === 'CORRECT').length;
  const recentAccuracy = recentFeedbacks.length > 0 ? (recentCorrect / recentFeedbacks.length) * 100 : overallAccuracy;

  // Improvement trend (compare last 30 days to previous 30 days)
  const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
  const previousFeedbacks = feedbacks.filter(f => f.timestamp >= sixtyDaysAgo && f.timestamp < thirtyDaysAgo);
  const previousCorrect = previousFeedbacks.filter(f => f.accuracy === 'CORRECT').length;
  const previousAccuracy = previousFeedbacks.length > 0 ? (previousCorrect / previousFeedbacks.length) * 100 : recentAccuracy;

  let improvementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
  if (recentAccuracy > previousAccuracy + 5) improvementTrend = 'IMPROVING';
  else if (recentAccuracy < previousAccuracy - 5) improvementTrend = 'DECLINING';

  return {
    totalFeedbacks: feedbacks.length,
    correctPredictions: correct,
    incorrectPredictions: incorrect,
    partialPredictions: partial,
    overallAccuracy: Math.round(overallAccuracy * 100) / 100,
    accuracyByZoneType: accuracyByZoneTypePercent,
    accuracyByScore: accuracyByScorePercent,
    recentAccuracy: Math.round(recentAccuracy * 100) / 100,
    improvementTrend,
  };
};

/**
 * Save learning data for AI improvement
 */
export const saveLearningData = (
  zone: SMCZone,
  marketBias: MarketBias | null,
  aiConfidence: number,
  feedback: ZoneFeedback
): void => {
  const learningData: AILearningData = {
    zoneId: zone.id,
    zoneType: zone.type,
    zoneScore: zone.score,
    marketConditions: {
      trend: marketBias?.trend || 'Unknown',
      structure: marketBias?.structure || 'Unknown',
      premiumDiscount: marketBias?.premiumDiscount || 'Unknown',
      smtDivergence: marketBias?.smtDivergence || 'None',
    },
    aiConfidence,
    userFeedback: feedback,
    timestamp: Date.now(),
  };

  const existing = JSON.parse(localStorage.getItem(LEARNING_DATA_KEY) || '[]');
  const updated = [...existing, learningData].slice(-1000); // Keep last 1000 entries
  localStorage.setItem(LEARNING_DATA_KEY, JSON.stringify(updated));
};

/**
 * Get learning data for AI analysis
 */
export const getLearningData = (): AILearningData[] => {
  return JSON.parse(localStorage.getItem(LEARNING_DATA_KEY) || '[]');
};

/**
 * Analyze learning data to improve zone scoring
 */
export const analyzeLearningData = (): {
  zoneTypeAccuracy: Record<string, number>;
  scoreThresholds: Record<string, number>;
  marketConditionAccuracy: Record<string, number>;
} => {
  const learningData = getLearningData();
  
  if (learningData.length === 0) {
    return {
      zoneTypeAccuracy: {},
      scoreThresholds: {},
      marketConditionAccuracy: {},
    };
  }

  // Analyze by zone type
  const zoneTypeStats: Record<string, { correct: number; total: number }> = {};
  learningData.forEach(data => {
    if (!zoneTypeStats[data.zoneType]) {
      zoneTypeStats[data.zoneType] = { correct: 0, total: 0 };
    }
    zoneTypeStats[data.zoneType].total++;
    if (data.userFeedback.accuracy === 'CORRECT') {
      zoneTypeStats[data.zoneType].correct++;
    }
  });

  const zoneTypeAccuracy: Record<string, number> = {};
  Object.entries(zoneTypeStats).forEach(([type, stats]) => {
    zoneTypeAccuracy[type] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  // Analyze by score range
  const scoreRanges: Record<string, { correct: number; total: number }> = {};
  learningData.forEach(data => {
    const range = `${Math.floor(data.zoneScore / 10) * 10}-${Math.floor(data.zoneScore / 10) * 10 + 10}`;
    if (!scoreRanges[range]) {
      scoreRanges[range] = { correct: 0, total: 0 };
    }
    scoreRanges[range].total++;
    if (data.userFeedback.accuracy === 'CORRECT') {
      scoreRanges[range].correct++;
    }
  });

  const scoreThresholds: Record<string, number> = {};
  Object.entries(scoreRanges).forEach(([range, stats]) => {
    scoreThresholds[range] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  // Analyze by market conditions
  const marketConditionStats: Record<string, { correct: number; total: number }> = {};
  learningData.forEach(data => {
    const condition = `${data.marketConditions.trend}-${data.marketConditions.structure}-${data.marketConditions.premiumDiscount}`;
    if (!marketConditionStats[condition]) {
      marketConditionStats[condition] = { correct: 0, total: 0 };
    }
    marketConditionStats[condition].total++;
    if (data.userFeedback.accuracy === 'CORRECT') {
      marketConditionStats[condition].correct++;
    }
  });

  const marketConditionAccuracy: Record<string, number> = {};
  Object.entries(marketConditionStats).forEach(([condition, stats]) => {
    marketConditionAccuracy[condition] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return {
    zoneTypeAccuracy,
    scoreThresholds,
    marketConditionAccuracy,
  };
};

/**
 * Get personalized zone score adjustment based on user feedback
 */
export const getPersonalizedScoreAdjustment = (
  zone: SMCZone,
  marketBias: MarketBias | null
): number => {
  const learningData = getLearningData();
  const analysis = analyzeLearningData();

  let adjustment = 0;

  // Adjust based on zone type accuracy
  if (analysis.zoneTypeAccuracy[zone.type]) {
    const typeAccuracy = analysis.zoneTypeAccuracy[zone.type];
    if (typeAccuracy > 70) adjustment += 5; // Boost if this type is accurate for user
    else if (typeAccuracy < 50) adjustment -= 5; // Reduce if this type is inaccurate
  }

  // Adjust based on score range accuracy
  const scoreRange = `${Math.floor(zone.score / 10) * 10}-${Math.floor(zone.score / 10) * 10 + 10}`;
  if (analysis.scoreThresholds[scoreRange]) {
    const rangeAccuracy = analysis.scoreThresholds[scoreRange];
    if (rangeAccuracy > 75) adjustment += 3;
    else if (rangeAccuracy < 50) adjustment -= 3;
  }

  // Adjust based on market conditions
  if (marketBias) {
    const condition = `${marketBias.trend}-${marketBias.structure}-${marketBias.premiumDiscount}`;
    if (analysis.marketConditionAccuracy[condition]) {
      const conditionAccuracy = analysis.marketConditionAccuracy[condition];
      if (conditionAccuracy > 70) adjustment += 2;
      else if (conditionAccuracy < 50) adjustment -= 2;
    }
  }

  return Math.max(-10, Math.min(10, adjustment)); // Limit adjustment to ±10
};

