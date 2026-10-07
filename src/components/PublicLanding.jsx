import { ArrowDown, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, Cloud, Flame, Menu, Moon, Smartphone, Sparkles, X, BarChart3, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: ClipboardList, title: 'Smart Task Management', text: 'Keep the important things clear, sorted, and moving.' },
  { icon: CalendarDays, title: 'Calendar', text: 'See what’s ahead and make space for what matters.' },
  { icon: Bell, title: 'Smart Reminders', text: 'A nudge at the right moment helps you stay on track.' },
  { icon: Smartphone, title: 'Multi-device Sync', text: 'Your plans stay in sync across your devices.' },
  { icon: Flame, title: 'Habit Tracking', text: 'Build small routines and celebrate showing up.' },
  { icon: BarChart3, title: 'Productivity Analytics', text: 'Notice your momentum with useful, honest insights.' },
  { icon: Moon, title: 'Dark Mode', text: 'Settle into a focused space, day or night.' },
  { icon: Cloud, title: 'Cloud Backup', text: 'Your planner stays with your account, wherever you sign in.' },
];

const steps = ['Create your account', 'Add your tasks', 'Set reminders', 'Complete your tasks', 'Track your progress'];

export default function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="landing">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand"><span className="brand-mark">d</span><span>daymark</span></Link>
          <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? 'top-nav open' : 'top-nav'} aria-label="Main navigation">
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <Link to="/login" className="nav-login">Log in</Link>
            <Link to="/register" className="button button-primary nav-cta">Get Started <ArrowUpRight size={16} /></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> A little more intention, every day</span>
            <h1>Plan your day.<br />Stay focused.<br /><span>Get things done.</span></h1>
            <p className="hero-subtitle">A simple smart planner to organize your tasks, habits, reminders, and everyday life.</p>
            <div className="hero-actions"><Link className="button button-primary button-large" to="/register">Get Started <ArrowRight size={18} /></Link><Link className="button button-secondary button-large" to="/login">Login</Link></div>
            <div className="hero-assurance"><span className="avatar-stack"><i>✓</i><i>✓</i><i>✓</i></span><span>Private by design. Yours from day one.</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a private daily planner">
            <div className="sun-orbit" />
            <div className="planner-window">
              <div className="planner-top"><span className="window-dots"><i /><i /><i /></span><span className="planner-date">STATIC PREVIEW · EXAMPLE ONLY</span><span className="tiny-avatar">S</span></div>
              <div className="planner-greeting"><div><small>YOUR WEDNESDAY</small><h2>A day with room<br />to do good things.</h2></div><span className="weather-mark">☀</span></div>
              <div className="planner-progress"><div><span>Today’s focus</span><b>2 of 4 done</b></div><span className="progress-track"><i /></span></div>
              <div className="mock-task done"><span className="mock-check"><Check size={12} /></span><span><b>Morning pages</b><small>8:30 AM <em>PERSONAL</em></small></span><span className="task-spark">✳</span></div>
              <div className="mock-task"><span className="mock-check" /><span><b>Project check-in</b><small>10:00 AM <em>WORK</em></small></span><span className="task-spark">◷</span></div>
              <div className="mock-task"><span className="mock-check" /><span><b>Take a proper lunch</b><small>12:30 PM <em>WELLBEING</em></small></span><span className="task-spark">◷</span></div>
              <div className="mock-task done"><span className="mock-check"><Check size={12} /></span><span><b>Plan the week</b><small>9:00 AM <em>PERSONAL</em></small></span><span className="task-spark">✳</span></div>
              <div className="planner-note"><span>✦</span><span><b>One thing at a time.</b><small>You’re finding your rhythm.</small></span></div>
            </div>
            <div className="floating-note"><span className="note-icon"><Bell size={16} /></span><span><b>A gentle reminder</b><small>Take a moment to stretch</small></span></div>
            <div className="floating-badge"><span>✦</span> A calmer kind of productive</div>
            <div className="hero-scribble" aria-hidden="true">a fresh start <ArrowDown size={18} /></div>
          </div>
        </section>

        <section className="trust-strip"><span>MAKE SPACE FOR WHAT MATTERS</span><i /><span>YOUR PLANS, YOURS ALONE</span><i /><span>A BETTER RHYTHM STARTS SMALL</span></section>

        <section className="features-section section-wrap" id="features">
          <div className="section-heading"><div><span className="eyebrow">LESS JUGGLING, MORE LIVING</span><h2>Everything you need.<br /><span>Nothing you don’t.</span></h2></div><p>Your day has a lot going on. Daymark helps you bring it all together in one clear, considered place.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-tone-${index}`}><Icon size={20} strokeWidth={1.8} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="how-section" id="how-it-works"><div className="how-inner section-wrap"><div className="how-copy"><span className="eyebrow">A SIMPLE WAY FORWARD</span><h2>Start where<br />you are.</h2><p>No complicated setup or perfect routine required. Just a few small steps to make your day feel a little more yours.</p><Link to="/register" className="text-link">Make a plan of your own <ArrowRight size={16} /></Link></div><div className="steps-list">{steps.map((step, index) => <div className="step-row" key={step}><span className="step-number">0{index + 1}</span><span className="step-name">{step}</span>{index === 4 && <Sparkles className="step-sparkle" size={17} />}</div>)}</div></div></section>

        <section className="privacy-section section-wrap"><div className="privacy-card"><div className="privacy-symbol"><LockKeyholeIcon /></div><div><span className="eyebrow">A PERSONAL SPACE SHOULD FEEL PERSONAL</span><h2>Your tasks are private.</h2><p>Your personal planner is securely connected to your account. Other users cannot see your tasks. Your plans belong to you, and only you.</p></div><div className="privacy-seal"><span>✳</span><small>PRIVATE<br />BY DESIGN</small></div></div></section>

        <section className="cta-section"><div className="cta-inner"><span className="eyebrow">TOMORROW CAN FEEL DIFFERENT</span><h2>Start planning<br />your day.</h2><p>Make a little room for the things that matter to you.</p><Link to="/register" className="button button-light button-large">Create Free Account <ArrowRight size={18} /></Link><div className="cta-orbit orbit-one" /><div className="cta-orbit orbit-two" /></div></section>
      </main>
      <footer className="site-footer"><Link to="/" className="brand"><span className="brand-mark">d</span><span>daymark</span></Link><span>A little more intention, every day.</span><div><Link to="/login">Log in</Link><Link to="/register">Create account</Link></div><small>© {new Date().getFullYear()} Daymark</small></footer>
    </div>
  );
}

function LockKeyholeIcon() {
  return <span className="lock-shape"><Cloud size={24} /><span>✓</span></span>;
}
