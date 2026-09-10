type IconProps = {
  size?: number;
  strokeWidth?: number;
};

function base(size: number, sw: number, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SunIcon({ size = 22, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ));
}

export function ListIcon({ size = 22, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ));
}

export function UserIcon({ size = 22, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ));
}

export function SlidersIcon({ size = 22, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ));
}

export function CheckIcon({ size = 22, strokeWidth = 2.4 }: IconProps) {
  return base(size, strokeWidth, <path d="M5 12l4.5 4.5L19 7" />);
}

export function SparklesIcon({ size = 18, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6-4.7-1.9 4.7-1.9z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ));
}

export function FireIcon({ size = 18, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <path d="M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4 .5 1 1.5 1.5 2 1.5 0-2-.5-4 0-5.5z" />
  ));
}

export function LockIcon({ size = 15, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ));
}

export function PlusIcon({ size = 20, strokeWidth = 2.4 }: IconProps) {
  return base(size, strokeWidth, <path d="M12 5v14M5 12h14" />);
}

export function PenIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <path d="M4 20l1-4L16 5l3 3L8 19z" />);
}

export function TrashIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13" />
    </>
  ));
}

export function ArchiveIcon({ size = 16, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v10h14V9M9 13h6" />
    </>
  ));
}

export function TrophyIcon({ size = 18, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 5H4v2a4 4 0 0 0 4 3M16 5h4v2a4 4 0 0 1-4 3M12 14v4m-3 2h6" />
    </>
  ));
}

export function LogoutIcon({ size = 18, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ));
}