interface LogoProps {
  onClick?: () => void;
  ariaLabel?: string;
}

export function Logo({ onClick, ariaLabel }: LogoProps) {
  const img = (
    <img
      src="/engram-signature.svg"
      alt="Engram"
      className="h-[186px] w-auto -mt-[26px] -mb-[54px] -ml-[16px] drop-shadow-[0_0_20px_rgba(82,209,184,0.35)]"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || 'Go to home'}
        className="flex items-center cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 hover:opacity-90 transition-opacity"
      >
        {img}
      </button>
    );
  }

  return <div className="flex items-center">{img}</div>;
}
