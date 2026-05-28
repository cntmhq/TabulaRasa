interface LogoProps {
  onClick?: () => void;
  ariaLabel?: string;
}

export function Logo({ onClick, ariaLabel }: LogoProps) {
  const inner = (
    <>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--color-brand-glow)] shadow-[0_0_15px_rgba(82,209,184,0.5)] rounded"
      >
         <path
          d="M13.5 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V9.5L13.5 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M13 3V10H20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Signature-like swoosh */}
        <path
          d="M7 16C9 15 11 17 13 14C14.5 11.75 16 16.5 18 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 12H11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
      <div className="text-left">
        <h1 className="text-xl font-bold tracking-widest text-[var(--color-brand-primary)] uppercase leading-none transition-colors">
          Engram
        </h1>
        <p className="text-[0.6rem] font-mono text-[var(--color-brand-primary)] tracking-widest uppercase opacity-70">
          GDPR Erasure Protocol
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || 'Go to home'}
        className="flex items-center gap-3 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 hover:opacity-90 transition-opacity"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}
