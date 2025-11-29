import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, X, Volume2, VolumeX } from 'lucide-react';
import { AlertRule } from '../services/alertService';
import { Notification } from '../types';
import { getDefaultAlertRules } from '../services/alertService';

interface AlertSystemProps {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
  onPlaySound?: () => void;
}

const AlertSystem: React.FC<AlertSystemProps> = ({ 
  notifications, 
  onNotificationsChange,
  onPlaySound 
}) => {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    const saved = localStorage.getItem('alert_rules');
    return saved ? JSON.parse(saved) : getDefaultAlertRules();
  });
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('sound_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('alert_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const clearNotifications = () => {
    onNotificationsChange([]);
  };

  const removeNotification = (id: string | number) => {
    onNotificationsChange(notifications.filter(n => String(n.id) !== String(id)));
  };

  const unreadCount = notifications.length;

  return (
    <div className="space-y-2">
      {/* Alert Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-700">
        <div className="flex items-center gap-2">
          <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
          <span className="text-xs font-bold text-white">
            Alertler ({unreadCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3 text-green-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-gray-500" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title="Ayarlar"
          >
            <Settings className="w-3 h-3 text-gray-400" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={clearNotifications}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 rounded border border-gray-700 bg-gray-800/50 space-y-2">
          <h4 className="text-xs font-bold text-white mb-2">Alert Kuralları</h4>
          {rules.map(rule => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-2 rounded border border-gray-700 bg-gray-800/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{rule.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    rule.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    rule.priority === 'HIGH' ? 'bg-yellow-500/20 text-yellow-400' :
                    rule.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {rule.priority}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{rule.condition}</p>
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  rule.enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">
            <BellOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>Henüz alert yok</p>
          </div>
        ) : (
          notifications.slice(0, 10).map(notif => (
            <div
              key={notif.id}
              className={`p-2 rounded border-l-2 text-[10px] bg-gray-800/50 border-${
                notif.type === 'error' ? 'red' :
                notif.type === 'warning' ? 'yellow' :
                notif.type === 'success' ? 'green' :
                'blue'
              }-500 hover:bg-gray-800 transition-colors`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-white">{notif.title}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-[9px]">{notif.time}</span>
                  <button
                    onClick={() => removeNotification(notif.id)}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="text-gray-400">{notif.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertSystem;

