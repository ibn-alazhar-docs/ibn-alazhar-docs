"use client";

import { useEffect, useId } from "react";

export default function DocsPage() {
  const id = useId();
  const containerId = `api-reference-${id.replace(/[:.]/g, "-")}`;

  useEffect(() => {
    if (document.getElementById(containerId)) {
      const script = document.createElement("script");
      script.id = "api-reference";
      script.setAttribute("data-url", "/api/docs/openapi");
      script.src =
        "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js";
      script.async = true;
      document.getElementById(containerId)?.appendChild(script);
      return () => {
        script.remove();
      };
    }
  }, [containerId]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div id={containerId} />
    </div>
  );
}
