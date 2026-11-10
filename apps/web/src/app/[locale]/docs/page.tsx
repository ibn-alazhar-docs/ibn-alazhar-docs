"use client";

import { useEffect } from "react";

export default function DocsPage() {
  const containerId = "api-reference-container";

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CI === "true" || process.env.NODE_ENV === "test") {
      return;
    }
    if (document.getElementById(containerId)) {
      const script = document.createElement("script");
      script.id = "api-reference";
      script.setAttribute("data-url", "/api/docs/openapi");
      script.src =
        "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js";
      script.async = true;
      script.onerror = () => {
        // keep docs page usable without external CDN
        script.remove();
      };
      document.getElementById(containerId)?.appendChild(script);
      return () => {
        script.remove();
      };
    }
  }, [containerId]);

  return (
    <div className="min-h-screen bg-page">
      <div id={containerId} />
    </div>
  );
}
