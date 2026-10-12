export type AvatarSize = 24 | 32 | 40;

export interface AvatarProps {
  /** Full name. Used for the initials and the accessible name. */
  name: string;
  size?: AvatarSize;
  /** Image URL. Falls back to initials when absent. */
  src?: string;
  /** FDS-101 `Online` indicator. */
  online?: boolean;
  /** Set when a visible name sits next to the avatar, so it isn't read twice. */
  decorative?: boolean;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** FDS-101 Avatar (node 73:12): Initials or Image, sizes 24/32/40. */
export function Avatar({ name, size = 32, src, online, decorative }: AvatarProps) {
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": name };
  return (
    <span className={`fx-avatar fx-avatar--${size}`} {...a11y}>
      {src ? <img className="fx-avatar__img" src={src} alt="" /> : <span className="fx-avatar__initials">{initials(name)}</span>}
      {online && <span className="fx-avatar__online" />}
    </span>
  );
}
