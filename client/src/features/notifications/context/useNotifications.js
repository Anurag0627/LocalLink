import { useContext } from 'react';
import { NotificationContext } from './NotificationContextState.js';

export function useNotificationsContext() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationsContext must be used within NotificationProvider');
  return context;
}

export default useNotificationsContext;
