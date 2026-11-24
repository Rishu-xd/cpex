import Image from 'next/image';

interface CpexLogoProps {
  size?: number;
  priority?: boolean;
  className?: string;
}

export function CpexLogo({
  size = 28,
  priority = false,
  className = '',
}: CpexLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="CPex logo"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain shrink-0 ${className}`.trim()}
    />
  );
}
