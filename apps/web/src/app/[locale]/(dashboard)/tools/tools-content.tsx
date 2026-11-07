"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { apiFetch } from "@/shared/api";

export function ToolsContent() {
  const t = useTranslations("tools");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRun(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/tools/tashkeel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError("error");
        setResult(null);
        return;
      }
      const data: unknown = await res.json();
      if (typeof data === "object" && data !== null && "result" in data) {
        const value = (data as { result: unknown }).result;
        setResult(typeof value === "string" ? value : null);
      } else {
        setResult(null);
        setError("error");
      }
    } catch {
      setError("error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (result === null) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      setError("error");
    }
  }

  return (
    <PageTransition>
      <Container>
        <Section>
          <Heading>{t("title")}</Heading>
          <Text>{t("tashkeel.description")}</Text>
          <label htmlFor="tashkeel-input">{t("tashkeel.name")}</label>
          <textarea
            id="tashkeel-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("tashkeel.placeholder")}
            rows={6}
          />
          <button type="button" onClick={handleRun} disabled={loading}>
            {t("tashkeel.run")}
          </button>
          {error !== null ? <Text>{error}</Text> : null}
          {result !== null ? (
            <div>
              <p>{t("tashkeel.result")}</p>
              <p>{result}</p>
              <button type="button" onClick={handleCopy}>
                {t("tashkeel.copy")}
              </button>
            </div>
          ) : null}
        </Section>
      </Container>
    </PageTransition>
  );
}
