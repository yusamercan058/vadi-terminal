import { SMCZone, MarketBias, Notification, JournalEntry, OpenPosition } from '../types';

export interface AlertRule {
  id: string;
  name: string;
  type: 'SETUP' | 'ENTRY' | 'EXIT' | 'RISK' | 'NEWS' | 'PRICE';
  condition: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  sound?: string;
  notification?: boolean;
}

/**
 * Check for setup alerts
 */
export const checkSetupAlerts = (
  zones: SMCZone[],
  rules: AlertRule[]
): Notification[] => {
  const alerts: Notification[] = [];
  const setupRules = rules.filter(r => r.type === 'SETUP' && r.enabled);
  
  zones.forEach(zone => {
    if (zone.status === 'FRESH') {
      setupRules.forEach(rule => {
        if (evaluateCondition(rule.condition, { zone })) {
          alerts.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            title: `🆕 Yeni Setup: ${zone.type}`,
            message: `${zone.type} setup'ı tespit edildi. Skor: ${zone.score}/100`,
            type: rule.priority === 'CRITICAL' ? 'error' : 
                  rule.priority === 'HIGH' ? 'warning' : 'info',
          });
        }
      });
      
      // Default high-score alert
      if (zone.score >= 80) {
        alerts.push({
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          title: '⭐ Yüksek Skorlu Setup',
          message: `${zone.type} setup'ı ${zone.score}/100 skor ile tespit edildi!`,
          type: 'success',
        });
      }
    }
  });
  
  return alerts;
};

/**
 * Check for risk alerts
 */
export const checkRiskAlerts = (
  positions: OpenPosition[],
  trades: JournalEntry[],
  balance: number,
  rules: AlertRule[]
): Notification[] => {
  const alerts: Notification[] = [];
  const riskRules = rules.filter(r => r.type === 'RISK' && r.enabled);
  
  // Calculate total risk
  const totalRisk = positions.reduce((sum, pos) => {
    const risk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.lotSize * 100000;
    return sum + risk;
  }, 0);
  
  const riskPercent = balance > 0 ? (totalRisk / balance) * 100 : 0;
  
  // Daily loss check
  const today = new Date().toDateString();
  const todayTrades = trades.filter(t => 
    new Date(t.date).toDateString() === today && t.status !== 'OPEN'
  );
  const todayLoss = todayTrades
    .filter(t => t.pnl && t.pnl < 0)
    .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
  const todayLossPercent = balance > 0 ? (todayLoss / balance) * 100 : 0;
  
  riskRules.forEach(rule => {
    if (evaluateCondition(rule.condition, { riskPercent, todayLossPercent, totalRisk })) {
      alerts.push({
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        title: '⚠️ Risk Uyarısı',
        message: rule.name || `Risk seviyesi: %${riskPercent.toFixed(1)}`,
        type: rule.priority === 'CRITICAL' ? 'error' : 'warning',
      });
    }
  });
  
  // Default risk alerts
  if (riskPercent >= 5) {
    alerts.push({
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      title: '🔴 Yüksek Risk',
      message: `Toplam risk %${riskPercent.toFixed(1)} seviyesinde!`,
      type: 'error',
    });
  }
  
  if (todayLossPercent >= 2) {
    alerts.push({
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      title: '📉 Günlük Kayıp',
      message: `Bugün %${todayLossPercent.toFixed(1)} kayıp var.`,
      type: 'warning',
    });
  }
  
  return alerts;
};

/**
 * Check for entry/exit alerts
 */
export const checkEntryExitAlerts = (
  zones: SMCZone[],
  currentPrice: number,
  rules: AlertRule[]
): Notification[] => {
  const alerts: Notification[] = [];
  const entryRules = rules.filter(r => (r.type === 'ENTRY' || r.type === 'EXIT') && r.enabled);
  
  zones.forEach(zone => {
    const inZone = currentPrice >= zone.priceBottom && currentPrice <= zone.priceTop;
    
    if (inZone && zone.status === 'FRESH') {
      entryRules.forEach(rule => {
        if (evaluateCondition(rule.condition, { zone, currentPrice })) {
          alerts.push({
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            title: rule.type === 'ENTRY' ? '🎯 Giriş Fırsatı' : '🚪 Çıkış Sinyali',
            message: `${zone.type} setup'ına fiyat yaklaştı.`,
            type: 'info',
          });
        }
      });
    }
  });
  
  return alerts;
};

/**
 * Evaluate alert condition (simplified)
 */
const evaluateCondition = (condition: string, context: any): boolean => {
  try {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    
    if (condition.includes('riskPercent >= 5')) {
      return context.riskPercent >= 5;
    }
    if (condition.includes('riskPercent >= 3')) {
      return context.riskPercent >= 3;
    }
    if (condition.includes('zone.score >= 80')) {
      return context.zone?.score >= 80;
    }
    if (condition.includes('zone.score >= 70')) {
      return context.zone?.score >= 70;
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Default alert rules
 */
export const getDefaultAlertRules = (): AlertRule[] => [
  {
    id: '1',
    name: 'Yüksek Skorlu Setup',
    type: 'SETUP',
    condition: 'zone.score >= 80',
    priority: 'HIGH',
    enabled: true,
    sound: 'default',
    notification: true,
  },
  {
    id: '2',
    name: 'Risk Limit Uyarısı',
    type: 'RISK',
    condition: 'riskPercent >= 5',
    priority: 'CRITICAL',
    enabled: true,
    sound: 'alert',
    notification: true,
  },
  {
    id: '3',
    name: 'Günlük Kayıp Uyarısı',
    type: 'RISK',
    condition: 'todayLossPercent >= 2',
    priority: 'HIGH',
    enabled: true,
    sound: 'warning',
    notification: true,
  },
  {
    id: '4',
    name: 'Giriş Fırsatı',
    type: 'ENTRY',
    condition: 'zone.score >= 70',
    priority: 'MEDIUM',
    enabled: true,
    notification: true,
  },
];

