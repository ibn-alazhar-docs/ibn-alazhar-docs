import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative isolate flex min-h-screen items-center justify-center bg-page ps-4 pe-4 py-12 sm:ps-6 sm:pe-6 lg:ps-8 lg:pe-8 focus:outline-none"
    >
      {/* Warm radial glows */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--gold)_0%,_transparent_55%)] opacity-[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--btn-primary-bg)_0%,_transparent_55%)] opacity-[0.04]" />
      </div>

      {/* Manuscript card */}
      <div className="card-manuscript w-full max-w-md rounded-xl bg-card ps-8 pe-8 py-8 shadow-lg sm:ps-10 sm:pe-10 sm:py-10">
        {children}
      </div>
    </main>
  );
}
