import type { ReactNode } from "react";

interface DirectionProviderProps {
  children: ReactNode;
}

// `dir`/`lang` are set server-side on <html> (root layout) and reinforced by the
// pre-paint inline script in <head>. A client-side post-hydration write would
// cause a redundant RTL reflow (esp. on locale switch), so this provider is now a
// pass-through. Locale switches re-render the server layout with the new dir.
export function DirectionProvider({ children }: DirectionProviderProps) {
  return <>{children}</>;
}
