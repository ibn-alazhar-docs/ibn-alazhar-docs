import Image from "next/image";

type BrandLogoProps = {
  /** Sizing classes for the mark; it is 178:212, so pair a height with `w-auto`. */
  className?: string;
  alt: string;
  priority?: boolean;
};

/**
 * The Ibn Al-Azhar mark. Two-tone (teal + antique gold) on paper, white + bright
 * gold on the Prussian dark surfaces — the old `brightness(0) invert(1)` filter
 * flattened both hues into one blob, so the swap is done with two assets instead.
 */
export function BrandLogo({ className, alt, priority }: BrandLogoProps) {
  // `cn` only concatenates, so caller sizing replaces the default rather than
  // stacking against it.
  const sizing = className ?? "h-10 w-auto shrink-0";
  return (
    <>
      <Image
        src="/brand/mark.svg"
        alt={alt}
        width={40}
        height={48}
        priority={priority}
        className={`${sizing} dark:hidden`}
      />
      <Image
        src="/brand/mark-white.svg"
        alt={alt}
        width={40}
        height={48}
        priority={priority}
        className={`${sizing} hidden dark:block`}
      />
    </>
  );
}
