"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderTree } from "@/ui/folders/folder-tree";
import { Breadcrumbs } from "@/ui/folders/breadcrumbs";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";

import { Card } from "@/ui/card";

interface Breadcrumb {
  id: string;
  name: string;
}

export default function FoldersPage() {
  const t = useTranslations("folders");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  function handleSelectFolder(folderId: string | null) {
    setSelectedFolderId(folderId);

    if (folderId) {
      fetch(`/api/folders/${folderId}/tree`)
        .then((r) => r.json())
        .then((data) => {
          if (data.targetFolder) {
            setBreadcrumbs([{ id: folderId, name: data.targetFolder.name }]);
          }
        })
        .catch(() => {
          setBreadcrumbs([{ id: folderId, name: "..." }]);
        });
    } else {
      setBreadcrumbs([]);
    }
  }

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <Stack gap={6}>
            {/* Header */}
            <div>
              <Heading level={2}>{t("title")}</Heading>
              <Text color="muted">{t("empty")}</Text>
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleSelectFolder} />
            )}

            {/* Folder Tree */}
            <Card className="p-6">
              <FolderTree selectedFolderId={selectedFolderId} onSelectFolder={handleSelectFolder} />
            </Card>
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
