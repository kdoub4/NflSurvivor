import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600/90 border border-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-xl backdrop-blur-xs animate-pulse"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Using local IndexedDB cache</span>
    </div>
  );
};
