"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
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
        setError(t("tashkeel.error"));
        setResult(null);
        return;
      }
      const data: unknown = await res.json();
      if (typeof data === "object" && data !== null && "result" in data) {
        const value = (data as { result: unknown }).result;
        setResult(typeof value === "string" ? value : null);
      } else {
        setResult(null);
        setError(t("tashkeel.error"));
      }
    } catch {
      setError(t("tashkeel.error"));
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
      setError(t("tashkeel.error"));
    }
  }

  return (
    <PageTransition>
      <Container>
        <Section className="py-6 space-y-4" padding="none">
          <Heading>{t("title")}</Heading>
          <Text color="muted">{t("tashkeel.description")}</Text>
          <label htmlFor="tashkeel-input">{t("tashkeel.name")}</label>
          <textarea
            id="tashkeel-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("tashkeel.placeholder")}
            rows={6}
            className="w-full min-h-40 rounded-lg border border-line bg-page p-3"
          />
          <Button type="button" onClick={handleRun} disabled={loading}>
            {loading ? t("tashkeel.loading") : t("tashkeel.run")}
          </Button>
          {loading ? <Text color="muted">{t("tashkeel.loading")}</Text> : null}
          {error !== null ? (
            <p role="alert">
              <Text color="error">{error}</Text>
            </p>
          ) : null}
          {result !== null ? (
            <div className="space-y-3">
              <p>{t("tashkeel.result")}</p>
              <p className="rounded-lg border p-3 whitespace-pre-wrap">{result}</p>
              <Button type="button" variant="outline" onClick={handleCopy}>
                {t("tashkeel.copy")}
              </Button>
            </div>
          ) : null}
        </Section>
      </Container>
    </PageTransition>
  );
}
