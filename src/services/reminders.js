import { collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export function scheduleVersion() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dateParts(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return { year, month, day, hour, minute, second: 0 };
}

function partsInZone(date, time, timezone) {
  const parts = dateParts(date, time);
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
  let timestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inZone = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]));
    const represented = Date.UTC(inZone.year, inZone.month - 1, inZone.day, inZone.hour, inZone.minute, inZone.second);
    const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    timestamp += desired - represented;
  }
  return new Date(timestamp);
}

export function createReminderDocuments(batch, uid, taskId, task) {
  const offsets = task.reminderEnabled && task.startTime
    ? [...new Set(task.reminderOffsets || [])].filter((value) => Number.isInteger(value) && value >= 0 && value <= 10080)
    : [];
  const timezone = task.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const reminderIds = [];
  const reminderSchedule = {};
  const reminders = collection(db, 'users', uid, 'reminders');

  offsets.forEach((offset) => {
    const id = `${taskId}_${offset}`;
    const scheduledAt = new Date(partsInZone(task.date, task.startTime, timezone).getTime() - offset * 60000);
    reminderIds.push(id);
    reminderSchedule[id] = scheduledAt.toISOString();
    batch.set(doc(reminders, id), {
      taskId,
      offsetMinutes: offset,
      occurrenceDate: task.date,
      timezone,
      scheduleVersion: task.scheduleVersion,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  });

  task.reminderIds = reminderIds;
  task.reminderSchedule = reminderSchedule;
}

export async function snoozeReminder(uid, task, originalReminderId, minutes) {
  const id = `snooze_${originalReminderId}_${Math.floor(Date.now() / 60000)}`;
  const reminders = collection(db, 'users', uid, 'reminders');
  const scheduledAt = new Date(Date.now() + minutes * 60000);
  return setDoc(doc(reminders, id), {
    taskId: task.id,
    offsetMinutes: 0,
    occurrenceDate: task.date,
    timezone: task.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    scheduleVersion: task.scheduleVersion,
    scheduledAt: Timestamp.fromDate(scheduledAt),
    status: 'pending',
    snoozed: true,
    createdAt: serverTimestamp(),
  });
}
