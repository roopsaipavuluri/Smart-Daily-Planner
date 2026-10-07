import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Bell, Check, LoaderCircle, Send, Trash2 } from 'lucide-react';
import { db } from '../firebase/firestore';
import {
  disableDeviceNotifications,
  enableDeviceNotifications,
  sendTestNotification,
  subscribeToForegroundNotifications,
  subscribeToNotificationDevices,
} from '../services/notifications';

export default function NotificationSettings({ user }) {
  const [devices, setDevices] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stopDevices = subscribeToNotificationDevices(user.uid, setDevices, (reason) => setError(reason.message));
    const stopProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setEnabled(snapshot.data()?.reminderNotificationsEnabled !== false);
    }, (reason) => setError(reason.message));
    return () => {
      stopDevices();
      stopProfile();
    };
  }, [user.uid]);

  async function registerThisDevice() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const { messaging, registration } = await enableDeviceNotifications(user.uid);
      subscribeToForegroundNotifications(messaging, registration);
      setPermission(Notification.permission);
      await setDoc(doc(db, 'users', user.uid), { reminderNotificationsEnabled: true }, { merge: true });
      setEnabled(true);
      setMessage('This device is registered for background reminders.');
    } catch (reason) {
      setError(reason.message);
      if ('Notification' in window) setPermission(Notification.permission);
    } finally {
      setBusy(false);
    }
  }

  async function updateEnabled(event) {
    const nextValue = event.target.checked;
    setBusy(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), { reminderNotificationsEnabled: nextValue }, { merge: true });
      setEnabled(nextValue);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeDevice(device) {
    setBusy(true);
    setError('');
    try {
      await disableDeviceNotifications(device);
      setMessage('Device removed from your notification list.');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await sendTestNotification();
      setMessage(`Test notification sent to ${result.data.sent} device${result.data.sent === 1 ? '' : 's'}.`);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel settings-panel notification-settings">
    <span className="eyebrow">REMINDERS & DEVICES</span>
    <h2><Bell size={18} /> Notifications</h2>
    <div className="settings-info"><span>Browser permission</span><b>{permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked in browser settings' : permission === 'unsupported' ? 'Not supported' : 'Not enabled'}</b></div>
    <div className="notification-toggle"><span><b>Reminder notifications</b><small>Allow scheduled reminders to reach your registered devices.</small></span><input type="checkbox" checked={enabled} onChange={updateEnabled} disabled={busy} aria-label="Enable reminder notifications" /></div>
    <div className="notification-actions">
      <button className="button button-secondary" type="button" onClick={registerThisDevice} disabled={busy || permission === 'denied'}><Bell size={15} /> {busy ? 'Working…' : 'Enable this device'}</button>
      <button className="button button-secondary" type="button" onClick={testNotification} disabled={busy || !devices.length}><Send size={15} /> Send test</button>
    </div>
    <div className="registered-devices"><div className="panel-heading"><div><span className="eyebrow">YOUR DEVICES</span><h3>{devices.length} registered</h3></div></div>
      {devices.length ? devices.map((device) => <div className="device-row" key={device.id}><span><b>{device.name || 'Browser device'}</b><small>Last active {device.lastSeenAt?.toDate ? device.lastSeenAt.toDate().toLocaleString() : 'recently'}</small></span><button type="button" className="icon-button" onClick={() => removeDevice(device)} disabled={busy} aria-label={`Remove ${device.name || 'device'}`}><Trash2 size={15} /></button></div>) : <p className="notification-empty">Enable notifications on each phone, laptop, or tablet to register it here.</p>}
    </div>
    {message && <p className="settings-feedback" role="status"><Check size={15} /> {message}</p>}
    {error && <p className="form-message error-message" role="alert">{error}</p>}
    {busy && <span className="sr-only"><LoaderCircle size={14} /> Working</span>}
  </section>;
}
