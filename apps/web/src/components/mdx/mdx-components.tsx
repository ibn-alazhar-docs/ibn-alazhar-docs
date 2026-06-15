import type { ComponentProps, ReactNode } from "react";

type HeadingProps = ComponentProps<"h2"> & { id?: string; children?: ReactNode };

function HeadingAnchor({
  id,
  children,
  level,
}: {
  id?: string;
  children?: ReactNode;
  level: 2 | 3 | 4;
}) {
  const Tag = `h${level}` as "h2" | "h3" | "h4";
  return (
    <Tag id={id}>
      {id && (
        <a href={`#${id}`} className="heading-anchor" aria-label={`الرابط إلى ${id}`}>
          #
        </a>
      )}
      {children}
    </Tag>
  );
}

export const mdxComponents = {
  h2: ({ id, children, ...props }: HeadingProps) => (
    <HeadingAnchor id={id} level={2} {...props}>
      {children}
    </HeadingAnchor>
  ),
  h3: ({ id, children, ...props }: HeadingProps) => (
    <HeadingAnchor id={id} level={3} {...props}>
      {children}
    </HeadingAnchor>
  ),
  h4: ({ id, children, ...props }: HeadingProps) => (
    <HeadingAnchor id={id} level={4} {...props}>
      {children}
    </HeadingAnchor>
  ),
  a: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  pre: ({ children, ...props }: ComponentProps<"pre">) => (
    <pre {...props} tabIndex={0}>
      {children}
    </pre>
  ),
};
