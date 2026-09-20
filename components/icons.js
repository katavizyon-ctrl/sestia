function Svg({ children, ...props }) {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FlameIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 22c4 0 7-3 7-7 0-4-3-6.5-4-9-1 2-2 3-2 5-2-1-2-4-1-6-4 2-6 6-6 10 0 4 3 7 6 7z" />
    </Svg>
  );
}

export function CameraIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function GalleryIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </Svg>
  );
}

export function GridIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </Svg>
  );
}

export function BackIcon(props) {
  return (
    <Svg strokeWidth="2.2" {...props}>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </Svg>
  );
}

export function KeepIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

export function SellIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20 12l-8 8-9-9V4h7z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Svg>
  );
}

export function DonateIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 20s-7-4.35-9.5-8.5C.7 8 2 4.5 5.5 4c2-.3 3.7.8 4.5 2.3C10.8 4.8 12.5 3.7 14.5 4 18 4.5 19.3 8 17.5 11.5 15 15.65 12 20 12 20z" />
    </Svg>
  );
}

export function TrashIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export function RecycleIcon(props) {
  return (
    <Svg {...props}>
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </Svg>
  );
}

export function CheckIcon(props) {
  return (
    <Svg strokeWidth="2.2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5 5-6" />
    </Svg>
  );
}

export function StarIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    </Svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <Svg strokeWidth="2.2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function FeedbackIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function SendIcon(props) {
  return (
    <Svg {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </Svg>
  );
}

export function CloseIcon(props) {
  return (
    <Svg strokeWidth="2.2" {...props}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </Svg>
  );
}

export const REC_META = {
  tut: { title: 'Öneri: Tut', label: 'Tut', varName: 'eucalyptus', Icon: KeepIcon },
  sat: { title: 'Öneri: Sat', label: 'Sat', varName: 'terracotta', Icon: SellIcon },
  bagisla: { title: 'Öneri: Bağışla', label: 'Bağışla', varName: 'slate', Icon: DonateIcon },
  at: { title: 'Öneri: At', label: 'At', varName: 'stone', Icon: TrashIcon },
  geri_donustur: { title: 'Öneri: Geri Dönüştür', label: 'Geri Dönüştür', varName: 'recycle', Icon: RecycleIcon },
};

export const REC_DONE_LABEL = {
  tut: 'tutuldu',
  sat: 'satışa çıktı',
  bagisla: 'bağışlandı',
  at: 'atıldı',
  geri_donustur: 'geri dönüşüme gitti',
};
