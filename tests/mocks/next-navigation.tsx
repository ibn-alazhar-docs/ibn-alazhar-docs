import React from "react";

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}

export function useParams() {
  return {};
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useSelectedLayoutSegment() {
  return null;
}

export function useSelectedLayoutSegments() {
  return [];
}

export function redirect() {
  return null;
}

export const Link = React.forwardRef(({ children, ...props }: any, ref: any) =>
  React.createElement("a", { ref, ...props }, children),
);

export default {
  useRouter,
  usePathname,
  useParams,
  useSearchParams,
  useSelectedLayoutSegment,
  useSelectedLayoutSegments,
  redirect,
  Link,
};
