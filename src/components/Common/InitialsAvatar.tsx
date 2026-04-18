import React from "react";

export type InitialsAvatarProps = {
  name?: string | null;
  className?: string;
};

const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, className = "" }) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "";
  return (
    <div
      className={`bg-brand-primary text-white font-bold flex items-center justify-center ${className}`}
    >
      {initial}
    </div>
  );
};

export default InitialsAvatar;
