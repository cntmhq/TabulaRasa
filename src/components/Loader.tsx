interface LoaderProps {
  size?: number;
  className?: string;
}

export function Loader({ size = 32, className = '' }: LoaderProps) {
  return (
    <div className={`w-full flex items-center justify-center py-8 ${className}`} role="status" aria-label="Loading">
      <img src={`${import.meta.env.BASE_URL}loader.svg`} width={size} height={size} alt="" />
    </div>
  );
}
