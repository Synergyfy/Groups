import { useState } from "react";
import { avatarImage, avatarStyle, initials } from "../../lib/avatar";

interface AvatarProps {
  id?: string;
  name: string;
  /** Central Hub avatar or business logo, when the member has one. */
  src?: string | null;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export default function Avatar({
  id,
  name,
  src,
  className = "",
  "aria-hidden": ariaHidden,
}: AvatarProps) {
  // A broken or blocked image falls back to the initials badge, and a new
  // source is tried again.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = src?.trim() || avatarImage(id);

  if (image && failedSrc !== image) {
    return (
      <img
        src={image}
        alt=""
        aria-hidden={ariaHidden}
        onError={() => setFailedSrc(image)}
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
