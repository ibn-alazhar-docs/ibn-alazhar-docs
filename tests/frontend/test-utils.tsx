import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/ui/theme/theme-provider";
import type { FolderNode, FlatFolder } from "@/core/folder-tree";
import type { AuthSession } from "@/domain/types";
import type { Role } from "@/domain/auth";

/** QueryClient factory — isolates cache per test. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  theme?: "light" | "dark" | "system";
}

/** Wrap a component with the providers it needs in the real app. */
export function AllProviders({
  children,
  queryClient,
  theme = "light",
}: ProvidersProps) {
  const client = queryClient ?? makeQueryClient();
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient; theme?: "light" | "dark" | "system" } & Omit<
    RenderOptions,
    "wrapper"
  > = {},
) {
  const { queryClient, theme, ...rest } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} theme={theme}>
        {children}
      </AllProviders>
    ),
    ...rest,
  });
}

/* ----------------------------- Mock factories ----------------------------- */

export function createFlatFolder(partial: Partial<FlatFolder> = {}): FlatFolder {
  return {
    id: partial.id ?? "folder-1",
    name: partial.name ?? "مجلد",
    parentId: partial.parentId ?? null,
    color: partial.color ?? null,
    icon: partial.icon ?? null,
    order: partial.order ?? 0,
    _count: partial._count ?? { documents: 0, children: 0 },
  };
}

export function createFolderNode(partial: Partial<FolderNode> = {}): FolderNode {
  const base = createFlatFolder(partial);
  return { ...base, children: partial.children ?? [] };
}

export function createSession(
  partial: Partial<{ id: string; email: string; role: Role }> = {},
): AuthSession {
  return {
    user: {
      id: partial.id ?? "user-1",
      email: partial.email ?? "student@example.com",
      name: "Student",
      role: partial.role ?? "STUDENT",
      image: null,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export * from "@testing-library/react";
