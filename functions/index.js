const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

initializeApp();

const db = getFirestore();
const REGION = 'us-central1';
const MAX_DUE_REMINDERS = 100;
const MAX_DELIVERY_AGE_MS = 30 * 60 * 1000;

function partsInZone(date, time, timezone) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]));
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    timestamp += Date.UTC(year, month - 1, day, hour, minute) - represented;
  }
  return new Date(timestamp);
}

function dateFromParts(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function nextOccurrenceDate(current, task) {
  const [year, month, day] = current.split('-').map(Number);
  const currentUtc = new Date(Date.UTC(year, month - 1, day));
  const recurrence = task.recurrence || { type: 'none' };
  const addDays = (count) => {
    const next = new Date(currentUtc);
    next.setUTCDate(next.getUTCDate() + count);
    return next.toISOString().slice(0, 10);
  };
  const weekdays = [...new Set(recurrence.weekdays || [])]
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
    .sort((left, right) => left - right);

  if (recurrence.type === 'daily') return addDays(1);
  if (recurrence.type === 'weekdays') {
    let next = addDays(1);
    while ([0, 6].includes(new Date(`${next}T00:00:00Z`).getUTCDay())) next = addDaysFrom(next, 1);
    return next;
  }
  if (recurrence.type === 'custom') return addDays(Math.max(1, Number(recurrence.intervalDays) || 1));
  if (recurrence.type === 'weekly') {
    const targetDays = weekdays.length ? weekdays : [currentUtc.getUTCDay()];
    for (let offset = 1; offset <= 7; offset += 1) {
      const candidate = addDays(offset);
      if (targetDays.includes(new Date(`${candidate}T00:00:00Z`).getUTCDay())) return candidate;
    }
  }
  if (recurrence.type === 'monthly') {
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
    return dateFromParts(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, Math.min(day, lastDay));
  }
  return null;
}

function addDaysFrom(date, count) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}

function timeDescription(occurrence, time, timezone) {
  const local = partsInZone(occurrence, time, timezone);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(local);
  const timeLabel = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(local);
  const todayLabel = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  return {
    date: occurrence === todayLabel ? 'Today' : dateLabel,
    time: timeLabel,
  };
}

function currentDateInZone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function advanceRecurringReminder(reminderRef, reminder, task, now) {
  const nextDate = nextOccurrenceDate(reminder.occurrenceDate, task);
  if (!nextDate || !task.startTime) {
    await reminderRef.update({ status: 'cancelled', processingAt: null });
    return;
  }
  const nextStart = partsInZone(nextDate, task.startTime, reminder.timezone);
  const nextReminder = new Date(nextStart.getTime() - reminder.offsetMinutes * 60000);
  await reminderRef.update({
    status: 'pending',
    occurrenceDate: nextDate,
    scheduledAt: Timestamp.fromDate(nextReminder),
    deliveredTokens: [],
    processingAt: null,
    lastError: null,
    skippedAt: Timestamp.fromDate(now),
  });
}

function buildPush(task, reminder, taskId) {
  const isDue = reminder.offsetMinutes === 0;
  const { date, time } = timeDescription(reminder.occurrenceDate, task.startTime, reminder.timezone);
  return {
    data: {
      title: isDue ? '🔔 Task Due' : '🔔 Task Reminder',
      body: isDue ? `It's time for: ${task.title}` : `${task.title} starts in ${reminder.offsetMinutes} minutes.`,
      taskId,
      reminderId: reminder.id,
      dueLabel: isDue ? 'Due now' : `${date} • ${time}`,
      url: `/tasks?focusTask=${encodeURIComponent(taskId)}`,
    },
    webpush: {
      headers: { TTL: '3600' },
      fcmOptions: { link: `/tasks?focusTask=${encodeURIComponent(taskId)}` },
    },
  };
}

async function claimReminder(ref, now) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const reminder = snapshot.data();
    const due = reminder.scheduledAt?.toMillis() <= now.getTime();
    const staleClaim = reminder.status === 'processing'
      && reminder.processingAt?.toMillis() <= now.getTime() - 5 * 60 * 1000;
    if (!(reminder.status === 'pending' && due) && !staleClaim) return null;
    transaction.update(ref, {
      status: 'processing',
      processingAt: Timestamp.fromDate(now),
    });
    return { ...reminder, id: ref.id };
  });
}

async function sendToTokens(tokens, payload) {
  const successes = [];
  const invalid = [];
  const failed = [];
  for (let index = 0; index < tokens.length; index += 500) {
    const batchTokens = tokens.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({ ...payload, tokens: batchTokens });
    response.responses.forEach((result, position) => {
      const token = batchTokens[position];
      if (result.success) successes.push(token);
      else if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(result.error?.code)) invalid.push(token);
      else failed.push(token);
    });
  }
  return { successes, invalid, failed };
}

async function processDueReminder(reminderRef, now) {
  const reminder = await claimReminder(reminderRef, now);
  if (!reminder) return;

  const segments = reminderRef.path.split('/');
  if (segments.length !== 4 || segments[0] !== 'users' || segments[2] !== 'reminders') {
    await reminderRef.update({ status: 'cancelled', processingAt: null });
    return;
  }
  const uid = segments[1];
  const taskRef = db.doc(`users/${uid}/tasks/${reminder.taskId}`);
  const userRef = db.doc(`users/${uid}`);
  const [taskSnapshot, userSnapshot, deviceSnapshot] = await Promise.all([
    taskRef.get(),
    userRef.get(),
    db.collection(`users/${uid}/devices`).get(),
  ]);

  if (!taskSnapshot.exists) {
    await reminderRef.update({ status: 'cancelled', processingAt: null });
    return;
  }

  const task = taskSnapshot.data();
  const settings = userSnapshot.data() || {};
  if (task.completed && task.reminderEnabled && task.scheduleVersion === reminder.scheduleVersion) {
    const completedAt = task.completedAt?.toDate ? task.completedAt.toDate() : now;
    const completedDate = currentDateInZone(completedAt, reminder.timezone);
    if (task.recurrence?.type && task.recurrence.type !== 'none' && reminder.occurrenceDate > completedDate) {
      await taskRef.update({ completed: false, completedAt: null, updatedAt: Timestamp.fromDate(now) });
    } else {
      await advanceRecurringReminder(reminderRef, reminder, task, now);
      return;
    }
  }
  if (!task.reminderEnabled || task.scheduleVersion !== reminder.scheduleVersion || settings.reminderNotificationsEnabled === false) {
    if (settings.reminderNotificationsEnabled === false && !task.completed && task.reminderEnabled && task.scheduleVersion === reminder.scheduleVersion) {
      await reminderRef.update({
        status: 'pending',
        scheduledAt: Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000)),
        processingAt: null,
      });
    } else await reminderRef.update({ status: 'cancelled', processingAt: null });
    return;
  }
  if (now.getTime() - reminder.scheduledAt.toMillis() > MAX_DELIVERY_AGE_MS && !reminder.snoozed) {
    await reminderRef.update({ status: 'expired', processingAt: null });
    return;
  }

  const registeredTokens = deviceSnapshot.docs.map((device) => device.data().token).filter(Boolean);
  const delivered = new Set(reminder.deliveredTokens || []);
  const tokens = registeredTokens.filter((token) => !delivered.has(token));
  if (!tokens.length) {
    if (!registeredTokens.length) {
      await reminderRef.update({
        status: 'pending',
        scheduledAt: Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000)),
        processingAt: null,
        lastError: 'No registered devices; retrying in five minutes.',
      });
      return;
    }
  }

  let successes = [];
  let invalid = [];
  let failed = [];
  if (tokens.length) {
    try {
      ({ successes, invalid, failed } = await sendToTokens(tokens, buildPush(task, { ...reminder, id: reminderRef.id }, reminder.taskId)));
    } catch (error) {
      logger.error('FCM send failed', { reminderPath: reminderRef.path, error });
      await reminderRef.update({
        status: 'pending',
        scheduledAt: Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000)),
        processingAt: null,
        lastError: error.message,
      });
      return;
    }
  }

  if (invalid.length) {
    const batch = db.batch();
    deviceSnapshot.docs.forEach((device) => {
      if (invalid.includes(device.data().token)) batch.delete(device.ref);
    });
    await batch.commit();
  }

  const deliveredTokens = [...delivered, ...successes];
  if (failed.length) {
    await reminderRef.update({
      status: 'pending',
      scheduledAt: Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000)),
      deliveredTokens,
      processingAt: null,
      lastError: `${failed.length} device(s) failed; successful devices will not receive duplicates.`,
    });
    return;
  }

  const nextDate = reminder.snoozed ? null : nextOccurrenceDate(reminder.occurrenceDate, task);
  if (!successes.length && registeredTokens.length && tokens.length) {
    await reminderRef.update({
      status: 'pending',
      scheduledAt: Timestamp.fromDate(new Date(now.getTime() + 5 * 60 * 1000)),
      deliveredTokens,
      processingAt: null,
      lastError: 'No device accepted the notification; retrying in five minutes.',
    });
    return;
  }
  if (!successes.length && !registeredTokens.length) return;

  if (nextDate && task.startTime) {
    const nextStart = partsInZone(nextDate, task.startTime, reminder.timezone);
    const nextReminder = new Date(nextStart.getTime() - reminder.offsetMinutes * 60000);
    await reminderRef.update({
      status: 'pending',
      occurrenceDate: nextDate,
      scheduledAt: Timestamp.fromDate(nextReminder),
      deliveredTokens: [],
      processingAt: null,
      lastError: null,
    });
  } else {
    await reminderRef.update({
      status: 'sent',
      deliveredTokens,
      processingAt: null,
      processedAt: Timestamp.fromDate(now),
      lastError: null,
    });
  }
}

// Runs once per minute, sends only due queue entries, and persists each result for safe retries.
exports.dispatchScheduledReminders = onSchedule({
  schedule: 'every 1 minutes',
  timeZone: 'UTC',
  region: REGION,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 120,
}, async () => {
  const now = new Date();
  const due = await db.collectionGroup('reminders')
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', Timestamp.fromDate(now))
    .orderBy('scheduledAt')
    .limit(MAX_DUE_REMINDERS)
    .get();
  for (const reminder of due.docs) {
    try {
      await processDueReminder(reminder.ref, now);
    } catch (error) {
      logger.error('Could not process scheduled reminder', { reminderPath: reminder.ref.path, error });
      await reminder.ref.update({
        status: 'pending',
        scheduledAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
        processingAt: null,
        lastError: error.message,
      });
    }
  }
});

exports.sendTestNotification = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to test your notifications.');
  const devices = await db.collection(`users/${request.auth.uid}/devices`).get();
  const tokens = devices.docs.map((device) => device.data().token).filter(Boolean);
  if (!tokens.length) throw new HttpsError('failed-precondition', 'Enable notifications on this device first.');
  const result = await sendToTokens(tokens, {
    data: {
      title: '🔔 Test notification',
      body: 'Your Daymark reminders are ready on this device.',
      taskId: '',
      reminderId: `test-${Date.now()}`,
      dueLabel: 'Notifications are connected',
      url: '/settings',
    },
    webpush: {
      headers: { TTL: '300' },
      fcmOptions: { link: '/settings' },
    },
  });
  if (!result.successes.length) throw new HttpsError('internal', 'Firebase could not deliver the test notification to your registered devices.');
  return { sent: result.successes.length };
});
