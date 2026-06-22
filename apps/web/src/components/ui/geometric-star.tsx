interface GeometricStarProps {
  className?: string;
}

export function GeometricStar({ className = "" }: GeometricStarProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <polygon
        points="50,5 63,38 98,38 70,60 79,95 50,75 21,95 30,60 2,38 37,38"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <polygon
        points="50,15 58,35 80,35 63,50 69,72 50,58 31,72 37,50 20,35 42,35"
        stroke="currentColor"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
