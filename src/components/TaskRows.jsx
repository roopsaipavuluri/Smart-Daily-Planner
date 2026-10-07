import { useState } from 'react';
import { Check, Clock3, Pencil, X } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

export default function TaskRows({ tasks, onToggle, onDelete, onEdit, onSnooze }) {
  const [customSnoozeTask, setCustomSnoozeTask] = useState('');
  const [customSnoozeMinutes, setCustomSnoozeMinutes] = useState('');
  if (!tasks.length) return <div className="empty-tasks"><span className="empty-sparkle">✳</span><b>Your day is clear 🎉</b><p>Enjoy the breathing room, or add something you’d like to do.</p></div>;
  return <div className="task-list">{tasks.map((task) => {
    const parsedDate = task.date ? parseISO(task.date) : null;
    const dateLabel = parsedDate ? format(parsedDate, isToday(parsedDate) ? "'Today'" : 'EEE, MMM d') : '';
    return <article className={`task-row ${task.completed ? 'task-completed' : ''}`} key={task.id} id={`task-${task.id}`}>
      <button className="task-checkbox" onClick={() => onToggle(task)} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>{task.completed && <Check size={13} />}</button>
      <div className="task-info"><b>{task.title}</b><span>{dateLabel}{task.startTime ? ` · ${task.startTime}` : ''}{task.category ? ` · ${task.category}` : ''}</span></div>
      <span className={`priority-dot priority-${task.priority || 'medium'}`} title={`${task.priority || 'medium'} priority`} />
      {onSnooze && task.reminderEnabled && !task.completed && <details className="task-snooze"><summary aria-label={`Snooze reminder for ${task.title}`} title="Snooze reminder"><Clock3 size={15} /></summary><div className="snooze-menu">{[5, 10, 15, 30].map((minutes) => <button type="button" key={minutes} onClick={() => onSnooze(task, minutes)}>{minutes} min</button>)}<div><input type="number" min="1" max="1440" aria-label="Custom snooze minutes" placeholder="Custom" value={customSnoozeTask === task.id ? customSnoozeMinutes : ''} onChange={(event) => { setCustomSnoozeTask(task.id); setCustomSnoozeMinutes(event.target.value); }} /><button type="button" onClick={(event) => { const value = Number(customSnoozeMinutes); if (customSnoozeTask === task.id && Number.isInteger(value) && value > 0 && value <= 1440) { onSnooze(task, value); setCustomSnoozeMinutes(''); event.currentTarget.closest('details').open = false; } }}>Set</button></div></div></details>}
      {onEdit && <button className="task-edit" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={15} /></button>}
      <button className="task-delete" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><X size={16} /></button>
    </article>;
  })}</div>;
}

export { TaskRows };
