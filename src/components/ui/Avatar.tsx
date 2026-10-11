import { avatarImage, avatarStyle, initials } from "../../lib/avatar";

interface AvatarProps {
  id?: string;
  name: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export default function Avatar({
  id,
  name,
  className = "",
  "aria-hidden": ariaHidden,
}: AvatarProps) {
  const src = avatarImage(id);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden={ariaHidden}
        className={`shrink-0 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden={ariaHidden}
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={avatarStyle(name)}
    >
      {initials(name)}
    </span>
  );
}
