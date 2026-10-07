import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { addDays, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { ArrowRight, CalendarDays, Check, CircleCheck, Clock3, Flame, Plus, Sparkles } from 'lucide-react';
import TaskRows from '../components/TaskRows';
import NotificationSettings from '../components/NotificationSettings';
import { useEffect } from 'react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function PageHeader({ eyebrow, title, detail, action }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</div>;
}

function todayTasks(tasks) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return tasks.filter((task) => task.date === today);
}

export function DashboardPage() {
  const { allTasks: tasks, name, error, toggleTask, deleteTask, editTask, snoozeTask, openQuickAdd } = useOutletContext();
  const todaysTasks = todayTasks(tasks);
  const completed = todaysTasks.filter((task) => task.completed).length;
  const upcoming = [...todaysTasks].filter((task) => !task.completed && task.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const percent = todaysTasks.length ? Math.round((completed / todaysTasks.length) * 100) : 0;

  return <>
    <PageHeader eyebrow={format(new Date(), 'EEEE, MMMM d').toUpperCase()} title={`${getGreeting()}, ${name} 👋`} detail="A little intention goes a long way. Here's your day at a glance." action={<button className="button button-primary" onClick={openQuickAdd}><Plus size={17} /> Add a task</button>} />
    <section className="welcome-panel"><div><span className="eyebrow">MAKE TODAY YOURS</span><h2>{todaysTasks.length ? 'One thing at a time.' : 'Your day is a blank page.'}</h2><p>{todaysTasks.length ? `You have ${todaysTasks.length} ${todaysTasks.length === 1 ? 'task' : 'tasks'} planned for today. Take them at your own pace.` : 'Add the things you want to make room for. You can always change your plan.'}</p></div><div className="welcome-art" aria-hidden="true"><span>✳</span><i /><i /></div></section>
    <section className="stat-grid" aria-label="Today's overview"><article className="stat-card"><span className="stat-icon tone-green"><CircleCheck size={18} /></span><small>Today’s tasks</small><strong>{todaysTasks.length}</strong><span className="stat-caption">planned for today</span></article><article className="stat-card"><span className="stat-icon tone-blue"><Check size={18} /></span><small>Completed</small><strong>{completed}<small className="stat-of"> / {todaysTasks.length}</small></strong><span className="stat-caption">nice work showing up</span></article><article className="stat-card"><span className="stat-icon tone-peach"><Sparkles size={18} /></span><small>Progress</small><strong>{percent}<small className="stat-of">%</small></strong><span className="stat-caption">your pace, your progress</span></article><article className="stat-card"><span className="stat-icon tone-purple"><Clock3 size={18} /></span><small>Coming up</small><strong className="next-task-time">{upcoming?.startTime || '—'}</strong><span className="stat-caption">{upcoming?.title || 'Nothing scheduled next'}</span></article></section>
    <div className="dashboard-columns"><section className="panel task-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR FOCUS</span><h2>Today’s plan</h2></div><Link to="/today" className="text-link">See today <ArrowRight size={15} /></Link></div><TaskRows tasks={todaysTasks.slice(0, 5)} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onSnooze={snoozeTask} /></section><aside className="panel week-panel"><div className="panel-heading"><div><span className="eyebrow">A MOMENT TO NOTICE</span><h2>Your week</h2></div><CalendarDays size={19} /></div><div className="week-days">{Array.from({ length: 7 }, (_, index) => { const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index); const date = format(day, 'yyyy-MM-dd'); const count = tasks.filter((task) => task.date === date && task.completed).length; return <div className={`week-day ${isToday(day) ? 'current' : ''}`} key={date}><span>{format(day, 'EEEEE')}</span><b>{format(day, 'd')}</b><i className={count ? 'has-done' : ''}>{count ? <Check size={10} /> : null}</i></div>; })}</div><p className="week-note"><Flame size={15} /> Progress is built one day at a time.</p></aside></div>
    {error && <p className="sr-only" role="status">{error}</p>}
  </>;
}

export function TodayPage() {
  const { tasks, toggleTask, deleteTask, editTask, snoozeTask, openQuickAdd } = useOutletContext();
  const todaysTasks = todayTasks(tasks);
  return <><PageHeader eyebrow="YOUR DAY, AT YOUR PACE" title="Today" detail={format(new Date(), 'EEEE, MMMM d, yyyy')} action={<button className="button button-primary" onClick={openQuickAdd}><Plus size={17} /> Add a task</button>} /><section className="panel full-task-panel"><div className="panel-heading"><div><span className="eyebrow">THE PLAN</span><h2>{todaysTasks.filter((task) => !task.completed).length} left to do</h2></div><span className="soft-tag">{todaysTasks.filter((task) => task.completed).length} completed</span></div><TaskRows tasks={todaysTasks} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onSnooze={snoozeTask} /></section></>;
}

export function TasksPage() {
  const { tasks, search, setSearch, toggleTask, deleteTask, editTask, snoozeTask, openQuickAdd } = useOutletContext();
  const [filter, setFilter] = useState('all');
  const filtered = tasks.filter((task) => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  return <><PageHeader eyebrow="KEEP IT MOVING" title="My tasks" detail="Everything you’ve planned, all in one place." action={<button className="button button-primary" onClick={openQuickAdd}><Plus size={17} /> Add a task</button>} /><div className="filter-tabs" role="tablist" aria-label="Filter tasks">{[['all', 'All tasks'], ['active', 'To do'], ['completed', 'Completed']].map(([value, label]) => <button role="tab" aria-selected={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>{search && <p className="search-result-count">{filtered.length} {filtered.length === 1 ? 'task' : 'tasks'} matching “{search}”</p>}<section className="panel full-task-panel"><TaskRows tasks={filtered} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onSnooze={snoozeTask} /></section></>;
}

export function CalendarPage() {
  const { allTasks: tasks, toggleTask, deleteTask, editTask, snoozeTask, openQuickAdd } = useOutletContext();
  const [selected, setSelected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const selectedTasks = tasks.filter((task) => task.date === selected);
  const parsed = parseISO(`${selected}T00:00:00`);
  return <><PageHeader eyebrow="MAKE SPACE FOR WHAT MATTERS" title="Calendar" detail="Choose a day to see what you’ve planned." action={<button className="button button-primary" onClick={() => openQuickAdd(selected)}><Plus size={17} /> Add a task</button>} /><section className="panel calendar-panel"><div className="calendar-date-control"><label htmlFor="calendar-date">Choose a date</label><input id="calendar-date" type="date" value={selected} onChange={(event) => setSelected(event.target.value)} /><span>{format(parsed, 'EEEE, MMMM d')}</span></div><div className="calendar-tasks"><div className="panel-heading"><div><span className="eyebrow">YOUR PLAN</span><h2>{selectedTasks.length ? `${selectedTasks.length} ${selectedTasks.length === 1 ? 'task' : 'tasks'}` : 'A little breathing room'}</h2></div></div><TaskRows tasks={selectedTasks} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} onSnooze={snoozeTask} /></div></section></>;
}

export function HabitsPage() {
  return <><PageHeader eyebrow="SMALL THINGS, OFTEN" title="Habits" detail="Build routines gently, one day at a time." /><section className="panel feature-placeholder"><span className="stat-icon tone-peach"><Flame size={19} /></span><h2>Your routines start here.</h2><p>Habit tracking is ready to grow with your planner. Your habit data will be kept private in your account.</p></section></>;
}

export function AnalyticsPage() {
  const { allTasks: tasks } = useOutletContext();
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const todayItems = tasks.filter((task) => task.date === today);
  const weekItems = tasks.filter((task) => task.date >= weekStart && task.date <= today);
  const complete = weekItems.filter((task) => task.completed).length;
  const rate = weekItems.length ? Math.round(complete / weekItems.length * 100) : 0;
  return <><PageHeader eyebrow="A MOMENT TO REFLECT" title="Your progress" detail="A clear look at what you’ve actually done. No pressure, just perspective." /><section className="stat-grid analytics-stats"><article className="stat-card"><span className="stat-icon tone-green"><CircleCheck size={18} /></span><small>Completed today</small><strong>{todayItems.filter((task) => task.completed).length}</strong><span className="stat-caption">tasks checked off</span></article><article className="stat-card"><span className="stat-icon tone-blue"><CalendarDays size={18} /></span><small>This week</small><strong>{complete}<small className="stat-of"> / {weekItems.length}</small></strong><span className="stat-caption">tasks completed</span></article><article className="stat-card"><span className="stat-icon tone-peach"><Sparkles size={18} /></span><small>Completion rate</small><strong>{rate}<small className="stat-of">%</small></strong><span className="stat-caption">for tasks planned this week</span></article></section><section className="panel reflection-panel"><span className="eyebrow">KEEP THIS IN MIND</span><h2>Progress isn’t a straight line.</h2><p>These numbers are based only on your own tasks. Every day is a fresh chance to begin again.</p></section></>;
}

export function SettingsPage() {
  const { name, user, timezone, saveTimezone } = useOutletContext();
  const [timezoneInput, setTimezoneInput] = useState(timezone);
  const [error, setError] = useState('');
  useEffect(() => setTimezoneInput(timezone), [timezone]);
  async function submitTimezone(event) {
    event.preventDefault();
    setError('');
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezoneInput }).format(new Date());
      await saveTimezone(timezoneInput);
    } catch {
      setError('Enter a valid IANA time zone, such as Asia/Kolkata.');
    }
  }
  return <><PageHeader eyebrow="YOUR PERSONAL SPACE" title="Settings" detail="Your account and the details that make your planner yours." /><section className="panel settings-panel"><span className="eyebrow">ACCOUNT</span><div className="settings-profile"><span className="profile-avatar large">{name.slice(0, 1).toUpperCase()}</span><div><h2>{name}</h2><p>{user?.email}</p></div></div><div className="settings-info"><span>Authentication</span><b>Secured by Firebase</b></div><form className="timezone-form" onSubmit={submitTimezone}><label htmlFor="planner-timezone">Planner time zone</label><div><input id="planner-timezone" value={timezoneInput} onChange={(event) => setTimezoneInput(event.target.value)} placeholder="Asia/Kolkata" /><button className="button button-secondary" type="submit">Save</button></div>{error && <p className="form-message error-message" role="alert">{error}</p>}<small>Reminders use this time zone, which defaults to your device’s local zone.</small></form><p className="settings-private"><Check size={16} /> Your planner is private to your account.</p></section><NotificationSettings user={user} /></>;
}

const pages = {
  dashboard: DashboardPage,
  today: TodayPage,
  tasks: TasksPage,
  calendar: CalendarPage,
  habits: HabitsPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
};

export default function PlannerPages({ page }) {
  const Page = pages[page];
  if (!Page) throw new Error(`Unknown planner page: ${page}`);
  return <Page />;
}
