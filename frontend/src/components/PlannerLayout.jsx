import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { BarChart3, CalendarDays, Check, ChevronDown, ClipboardList, Flame, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, Sun, X } from 'lucide-react';
import { auth } from '../firebase/auth';
import { db } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { createTask, removeTask, setTaskCompleted, subscribeToTasks, updateTask } from '../services/tasks';
import { snoozeReminder } from '../services/reminders';

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Today', path: '/today', icon: Sun },
  { label: 'My tasks', path: '/tasks', icon: ClipboardList },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Habits', path: '/habits', icon: Flame },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function PlannerLayout() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [taskTime, setTaskTime] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffsets, setReminderOffsets] = useState([15]);
  const [customOffset, setCustomOffset] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceInterval, setRecurrenceInterval] = useState(2);
  const [editingTask, setEditingTask] = useState(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const actionInProgress = useRef('');
  const location = useLocation();
  const navigate = useNavigate();
  const name = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToTasks(user.uid, (nextTasks) => {
      setTasks(nextTasks);
      setTasksLoaded(true);
      setLoadError('');
    }, (error) => setLoadError(`Your planner could not be loaded: ${error.message}`));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const profile = snapshot.data() || {};
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(profile.timezone || detectedTimezone);
      if (!profile.timezone) {
        setDoc(doc(db, 'users', user.uid), { timezone: detectedTimezone }, { merge: true }).catch((error) => {
          setLoadError(`Could not save your time zone: ${error.message}`);
        });
      }
    }, (error) => setLoadError(`Could not load your settings: ${error.message}`));
  }, [user?.uid]);

  useEffect(() => {
    setMobileMenu(false);
    setQuickAdd(false);
  }, [location.pathname]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? tasks.filter((task) => `${task.title} ${task.description || ''}`.toLowerCase().includes(term)) : tasks;
  }, [tasks, search]);

  async function logout() {
    setTasks([]);
    try {
      await signOut(auth);
      navigate('/', { replace: true });
    } catch (error) {
      setLoadError(`Could not log out: ${error.message}`);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    if (reminderEnabled && (!taskTime || !reminderOffsets.length)) {
      setLoadError('Choose a task time and at least one reminder time.');
      return;
    }
    setSaving(true);
    setLoadError('');
    const taskValues = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      date: taskDate,
      startTime: taskTime,
      priority: taskPriority,
      category: taskCategory.trim() || 'Personal',
      timezone,
      reminderEnabled,
      reminderOffsets: reminderEnabled ? [...new Set(reminderOffsets)] : [],
      recurrence: {
        type: recurrenceType,
        weekdays: recurrenceDays,
        intervalDays: recurrenceType === 'custom' ? Number(recurrenceInterval) : null,
      },
    };
    try {
      if (editingTask) await updateTask(user.uid, editingTask, taskValues);
      else await createTask(user.uid, taskValues);
      resetTaskForm();
      setQuickAdd(false);
    } catch (error) {
      setLoadError(`Could not save your task: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    try {
      await setTaskCompleted(user.uid, task, !task.completed);
    } catch (error) {
      setLoadError(`Could not update this task: ${error.message}`);
    }
  }

  async function snoozeTask(task, minutes) {
    try {
      await snoozeReminder(user.uid, task, `task-${task.id}`, minutes);
    } catch (error) {
      setLoadError(`Could not snooze this reminder: ${error.message}`);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Permanently delete “${task.title}”?`)) return;
    try {
      await removeTask(user.uid, task);
    } catch (error) {
      setLoadError(`Could not delete this task: ${error.message}`);
    }
  }

  function resetTaskForm(date = format(new Date(), 'yyyy-MM-dd')) {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDate(date);
    setTaskTime('');
    setTaskPriority('medium');
    setTaskCategory('Personal');
    setReminderEnabled(false);
    setReminderOffsets([15]);
    setCustomOffset('');
    setRecurrenceType('none');
    setRecurrenceDays([]);
    setRecurrenceInterval(2);
  }

  function openNewTask(date) {
    resetTaskForm(date || format(new Date(), 'yyyy-MM-dd'));
    setQuickAdd(true);
  }

  function editExistingTask(task) {
    setEditingTask(task);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskDate(task.date || format(new Date(), 'yyyy-MM-dd'));
    setTaskTime(task.startTime || '');
    setTaskPriority(task.priority || 'medium');
    setTaskCategory(task.category || 'Personal');
    setReminderEnabled(Boolean(task.reminderEnabled));
    setReminderOffsets(task.reminderOffsets || []);
    setCustomOffset('');
    setRecurrenceType(task.recurrence?.type || 'none');
    setRecurrenceDays(task.recurrence?.weekdays || []);
    setRecurrenceInterval(task.recurrence?.intervalDays || 2);
    setQuickAdd(true);
  }

  function toggleReminderOffset(offset) {
    setReminderOffsets((current) => current.includes(offset)
      ? current.filter((value) => value !== offset)
      : [...current, offset].sort((left, right) => left - right));
  }

  async function saveTimezone(nextTimezone) {
    await setDoc(doc(db, 'users', user.uid), { timezone: nextTimezone, updatedAt: serverTimestamp() }, { merge: true });
    setTimezone(nextTimezone);
  }

  useEffect(() => {
    if (!tasksLoaded || !location.search) return;
    const params = new URLSearchParams(location.search);
    const completeId = params.get('completeTask');
    const snoozeId = params.get('snoozeTask');
    const taskId = completeId || snoozeId;
    if (!taskId || actionInProgress.current === location.search) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    actionInProgress.current = location.search;
    const minutes = Number(params.get('minutes'));
    const reminderId = params.get('reminderId') || `task-${task.id}`;
    navigate({ pathname: location.pathname, search: '', hash: location.hash }, { replace: true });
    if (completeId && !task.completed) toggleTask(task);
    else if ([5, 10, 15, 30].includes(minutes)) {
      snoozeReminder(user.uid, task, reminderId, minutes).catch((error) => {
        setLoadError(`Could not snooze this reminder: ${error.message}`);
      });
    } else setLoadError('This reminder has an invalid snooze duration.');
  }, [location.hash, location.pathname, location.search, navigate, tasks, tasksLoaded, user?.uid]);

  const content = {
    tasks: filteredTasks,
    allTasks: tasks,
    search,
    setSearch,
    name,
    error: loadError,
    toggleTask,
    snoozeTask,
    deleteTask,
    editTask: editExistingTask,
    openQuickAdd: openNewTask,
    user,
    timezone,
    saveTimezone,
    clearError: () => setLoadError(''),
  };

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <Link to="/dashboard" className="brand sidebar-brand"><span className="brand-mark">d</span><span>daymark</span></Link>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Planner">
          {navigation.map(({ label, path, icon: Icon }) => <NavLink end={path === '/dashboard'} to={path} key={path} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{path === '/today' && <span className="nav-today-dot" />}</NavLink>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><span>✦</span><b>Small steps count.</b><p>Keep showing up for the things that matter.</p></div>
        <button className="profile-button" onClick={logout} aria-label={`Log out ${name}`}><span className="profile-avatar">{name.slice(0, 1).toUpperCase()}</span><span className="profile-copy"><b>{name}</b><small>{user?.email}</small></span><LogOut size={15} /><span className="logout-label">Log out</span></button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu /></button>
          <div className="breadcrumb"><span>My planner</span><span>/</span><b>{navigation.find((item) => location.pathname.startsWith(item.path))?.label || 'Overview'}</b></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your tasks…" aria-label="Search tasks" /><kbd>⌘ K</kbd></label>
            <button className="top-avatar" onClick={logout} title="Log out">{name.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        <main className="app-content">
          {loadError && <div className="app-error" role="alert"><span>{loadError}</span><button onClick={() => setLoadError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          <Outlet context={content} />
        </main>
      </div>
      <button className="quick-add-button" onClick={() => openNewTask()} aria-label="Add task"><Plus size={21} /><span>New task</span></button>
      {quickAdd && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickAdd(false); }}>
        <section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-title">
          <div className="quick-modal-head"><div><span className="eyebrow">{editingTask ? 'KEEP YOUR PLAN CURRENT' : 'A SMALL STEP FORWARD'}</span><h2 id="quick-title">{editingTask ? 'Edit task' : 'Add a task'}</h2></div><button className="icon-button" onClick={() => setQuickAdd(false)} aria-label="Close"><X size={19} /></button></div>
          <form onSubmit={addTask}>
            <label className="quick-title-label">Task title<input autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Take a walk after lunch" maxLength={160} required /></label>
            <label>Notes <span className="optional-label">optional</span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} maxLength={1000} placeholder="Add helpful details" /></label>
            <div className="quick-fields"><label>Date<input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} required /></label><label>Time <span className="optional-label">optional</span><input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} /></label></div>
            <div className="quick-fields"><label>Priority<select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Category<input value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)} maxLength={40} /></label></div>
            <label className="reminder-enable"><input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} /> Enable scheduled reminders</label>
            {reminderEnabled && <div className="reminder-options">
              <span className="eyebrow">REMIND ME</span>
              <div className="reminder-checks">{[[0, 'At task time'], [5, '5 minutes before'], [10, '10 minutes before'], [15, '15 minutes before'], [30, '30 minutes before'], [60, '1 hour before']].map(([offset, label]) => <label key={offset}><input type="checkbox" checked={reminderOffsets.includes(offset)} onChange={() => toggleReminderOffset(offset)} />{label}</label>)}</div>
              <div className="custom-reminder"><label htmlFor="custom-reminder">Custom minutes before</label><div><input id="custom-reminder" type="number" min="1" max="10080" value={customOffset} onChange={(event) => setCustomOffset(event.target.value)} placeholder="e.g. 45" /><button type="button" className="button button-secondary" onClick={() => { const value = Number(customOffset); if (Number.isInteger(value) && value > 0 && value <= 10080) { toggleReminderOffset(value); setCustomOffset(''); } }}>Add</button></div></div>
              <label>Repeat<select value={recurrenceType} onChange={(event) => setRecurrenceType(event.target.value)}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom schedule</option></select></label>
              {recurrenceType === 'weekly' && <div className="weekday-checks">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}><input type="checkbox" checked={recurrenceDays.includes(index)} onChange={() => setRecurrenceDays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort())} />{day}</label>)}</div>}
              {recurrenceType === 'custom' && <label>Repeat every <span className="custom-interval"><input type="number" min="1" max="365" value={recurrenceInterval} onChange={(event) => setRecurrenceInterval(event.target.value)} /> days</span></label>}
              <small>Scheduled using {timezone}. Background delivery requires an internet connection and supported device/browser push.</small>
            </div>}
            <div className="quick-modal-actions"><button type="button" className="button button-secondary" onClick={() => setQuickAdd(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : editingTask ? 'Save changes' : 'Add task'} <Plus size={16} /></button></div>
          </form>
        </section>
      </div>}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navigation.slice(0, 5).map(({ label, path, icon: Icon }) => <NavLink end={path === '/dashboard'} to={path} key={path} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label === 'Overview' ? 'Home' : label}</span></NavLink>)}<NavLink to="/settings" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}><ChevronDown size={19} /><span>More</span></NavLink></nav>
    </div>
  );
}
