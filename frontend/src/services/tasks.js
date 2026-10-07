import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { createReminderDocuments, scheduleVersion } from './reminders';

function userTasks(uid) {
  if (!uid) throw new Error('A signed-in user is required to access tasks.');
  if (!db) throw new Error('Firebase is not configured. Add the required VITE_FIREBASE_* settings.');
  return collection(db, 'users', uid, 'tasks');
}

export function subscribeToTasks(uid, onTasks, onError) {
  return onSnapshot(
    query(userTasks(uid), orderBy('date', 'asc')),
    (snapshot) => onTasks(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  );
}

export function createTask(uid, task) {
  const taskRef = doc(userTasks(uid));
  const batch = writeBatch(db);
  const nextTask = {
    ...task,
    completed: false,
    scheduleVersion: scheduleVersion(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  createReminderDocuments(batch, uid, taskRef.id, nextTask);
  batch.set(taskRef, nextTask);
  return batch.commit();
}

export function updateTask(uid, task, updates) {
  const batch = writeBatch(db);
  const nextTask = {
    ...task,
    ...updates,
    scheduleVersion: scheduleVersion(),
    updatedAt: serverTimestamp(),
  };
  const nextReminderIds = nextTask.reminderEnabled && nextTask.startTime
    ? [...new Set(nextTask.reminderOffsets || [])].map((offset) => `${task.id}_${offset}`)
    : [];
  (task.reminderIds || []).filter((id) => !nextReminderIds.includes(id))
    .forEach((id) => batch.delete(doc(db, 'users', uid, 'reminders', id)));
  createReminderDocuments(batch, uid, task.id, nextTask);
  batch.update(doc(db, 'users', uid, 'tasks', task.id), nextTask);
  return batch.commit();
}

export function setTaskCompleted(uid, task, completed) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid, 'tasks', task.id), {
    completed,
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

export function removeTask(uid, task) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', uid, 'tasks', task.id));
  (task.reminderIds || []).forEach((id) => batch.delete(doc(db, 'users', uid, 'reminders', id)));
  return batch.commit();
}
