import { GraduationCap, LineChart, MonitorPlay, ShieldCheck } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

// Shared shell for every auth screen (login, signup, forgot/reset
// password): a brand panel on the left that states what the product
// actually does, and the form card on the right. On mobile the panel
// collapses to a compact brand header above the form.
const FEATURES = [
  {
    icon: MonitorPlay,
    title: "Video lectures, free previews",
    text: "Watch course lectures in the browser and preview selected lessons before you buy.",
  },
  {
    icon: LineChart,
    title: "Progress that sticks",
    text: "Every lecture you watch is tracked, so you can pick up exactly where you left off.",
  },
  {
    icon: ShieldCheck,
    title: "One account, two roles",
    text: "Join as a student or an instructor — instructors get the full sales dashboard.",
  },
];

const AuthLayout = ({ children }) => {
  return (
    <div className="grid flex-1 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">E-Learning</span>
        </Link>

        <div className="max-w-md space-y-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Learn it. Teach it.
              <br />
              Track every step.
            </h1>
            <p className="text-base text-primary-foreground/80">
              Courses, video lectures and progress tracking for students —
              and a real dashboard for the instructors behind them.
            </p>
          </div>
          <ul className="space-y-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-primary-foreground/75">{feature.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-sm text-primary-foreground/60">
          New here? Create an account and pick your role — you can start
          learning (or teaching) right away.
        </p>
      </aside>

      {/* Form column */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:py-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">E-Learning</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
