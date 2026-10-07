importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

const encodedConfig = new URL(self.location.href).searchParams.get('config');
if (encodedConfig) {
  firebase.initializeApp(JSON.parse(encodedConfig));
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(({ data }) => {
    if (!data?.title) return;
    self.registration.showNotification(data.title, {
      body: `${data.body || ''}${data.dueLabel ? `\n${data.dueLabel}` : ''}`,
      icon: '/icons/notification-192.png',
      badge: '/icons/notification-badge-72.png',
      tag: data.reminderId || 'daymark-notification',
      data,
      actions: data.taskId ? [
        { action: 'complete', title: 'Mark completed' },
        { action: 'snooze-5', title: 'Snooze 5 min' },
        { action: 'snooze-15', title: 'Snooze 15 min' },
      ] : [],
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const taskId = data.taskId;
  let path = data.url || '/';
  if (event.action === 'complete' && taskId) path = `/tasks?completeTask=${encodeURIComponent(taskId)}#task-${encodeURIComponent(taskId)}`;
  else if (event.action.startsWith('snooze-') && taskId) {
    const minutes = event.action.slice('snooze-'.length);
    path = `/tasks?snoozeTask=${encodeURIComponent(taskId)}&minutes=${encodeURIComponent(minutes)}&reminderId=${encodeURIComponent(data.reminderId || '')}`;
  } else if (taskId) path = `/tasks?focusTask=${encodeURIComponent(taskId)}#task-${encodeURIComponent(taskId)}`;
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
