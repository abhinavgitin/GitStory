import React from 'react';

export interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  className?: string;
  fill?: boolean;
  weight?: number;
  size?: number | string;
}

const TAILWIND_SIZE_MAP: Record<string, string> = {
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '4.5': '18px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '18': '72px',
  '20': '80px',
};

export function MaterialIcon({
  name,
  className = '',
  fill = false,
  weight = 400,
  size,
  style,
  ...props
}: MaterialIconProps) {
  let resolvedFontSize: string | undefined;

  if (size !== undefined) {
    resolvedFontSize = typeof size === 'number' ? `${size}px` : size;
  } else if (className) {
    const match = className.match(/\b(?:w|size)-([0-9]+(?:\.[0-9]+)?)\b/);
    if (match && TAILWIND_SIZE_MAP[match[1]]) {
      resolvedFontSize = TAILWIND_SIZE_MAP[match[1]];
    }
  }

  return (
    <span
      className={`material-symbols-outlined select-none shrink-0 ${className}`}
      style={{
        ...(resolvedFontSize ? { fontSize: resolvedFontSize } : {}),
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}

// ── Named icon exports mapped to Google Material Symbols ──
export type IconProps = Omit<MaterialIconProps, 'name'>;

export const ArrowLeft = (props: IconProps) => <MaterialIcon name="arrow_back" {...props} />;
export const ArrowRight = (props: IconProps) => <MaterialIcon name="arrow_forward" {...props} />;
export const Clock = (props: IconProps) => <MaterialIcon name="schedule" {...props} />;
export const RotateCcw = (props: IconProps) => <MaterialIcon name="refresh" {...props} />;
export const CheckCircle2 = (props: IconProps) => <MaterialIcon name="check_circle" {...props} />;
export const AlertCircle = (props: IconProps) => <MaterialIcon name="error" {...props} />;
export const AlertTriangle = (props: IconProps) => <MaterialIcon name="warning" {...props} />;
export const Search = (props: IconProps) => <MaterialIcon name="search" {...props} />;
export const Star = (props: IconProps) => <MaterialIcon name="star" {...props} />;
export const GitFork = (props: IconProps) => <MaterialIcon name="fork_right" {...props} />;
export const GitBranch = (props: IconProps) => <MaterialIcon name="alt_route" {...props} />;
export const GitCommit = (props: IconProps) => <MaterialIcon name="commit" {...props} />;
export const GitMerge = (props: IconProps) => <MaterialIcon name="call_merge" {...props} />;
export const GitPullRequest = (props: IconProps) => <MaterialIcon name="call_merge" {...props} />;
export const ExternalLink = (props: IconProps) => <MaterialIcon name="open_in_new" {...props} />;
export const Globe = (props: IconProps) => <MaterialIcon name="public" {...props} />;
export const Flame = (props: IconProps) => <MaterialIcon name="local_fire_department" {...props} />;
export const Trophy = (props: IconProps) => <MaterialIcon name="trophy" {...props} />;
export const Calendar = (props: IconProps) => <MaterialIcon name="calendar_today" {...props} />;
export const UserCheck = (props: IconProps) => <MaterialIcon name="how_to_reg" {...props} />;
export const UserX = (props: IconProps) => <MaterialIcon name="person_off" {...props} />;
export const Users = (props: IconProps) => <MaterialIcon name="group" {...props} />;
export const Moon = (props: IconProps) => <MaterialIcon name="dark_mode" {...props} />;
export const Sun = (props: IconProps) => <MaterialIcon name="light_mode" {...props} />;
export const BarChart3 = (props: IconProps) => <MaterialIcon name="bar_chart" {...props} />;
export const PieChart = (props: IconProps) => <MaterialIcon name="pie_chart" {...props} />;
export const Layers = (props: IconProps) => <MaterialIcon name="layers" {...props} />;
export const Code2 = (props: IconProps) => <MaterialIcon name="code" {...props} />;
export const ChevronDown = (props: IconProps) => <MaterialIcon name="expand_more" {...props} />;
export const ChevronUp = (props: IconProps) => <MaterialIcon name="expand_less" {...props} />;
export const ServerOff = (props: IconProps) => <MaterialIcon name="cloud_off" {...props} />;
export const FolderGit2 = (props: IconProps) => <MaterialIcon name="folder_open" {...props} />;
export const Insights = (props: IconProps) => <MaterialIcon name="insights" {...props} />;
export const Shield = (props: IconProps) => <MaterialIcon name="shield" {...props} />;
export const ShieldCheck = (props: IconProps) => <MaterialIcon name="verified_user" {...props} />;
export const MapPin = (props: IconProps) => <MaterialIcon name="location_on" {...props} />;
export const Building = (props: IconProps) => <MaterialIcon name="business" {...props} />;
export const Link = (props: IconProps) => <MaterialIcon name="link" {...props} />;
export const LinkIcon = (props: IconProps) => <MaterialIcon name="link" {...props} />;
export const CircleDot = (props: IconProps) => <MaterialIcon name="radio_button_checked" {...props} />;
export const XCircle = (props: IconProps) => <MaterialIcon name="cancel" {...props} />;
export const Tag = (props: IconProps) => <MaterialIcon name="label" {...props} />;
export const Eye = (props: IconProps) => <MaterialIcon name="visibility" {...props} />;
export const HardDrive = (props: IconProps) => <MaterialIcon name="hard_drive" {...props} />;
export const Archive = (props: IconProps) => <MaterialIcon name="archive" {...props} />;
export const Info = (props: IconProps) => <MaterialIcon name="info" {...props} />;
export const Loader = (props: IconProps) => <MaterialIcon name="progress_activity" {...props} />;
export const Activity = (props: IconProps) => <MaterialIcon name="vital_signs" {...props} />;
