import React, { useState } from 'react';
import { useUserProfile } from '../../lib/userSync';

interface UserAvatarProps {
  userId?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  className?: string;
  sizeClassName?: string;
  textSizeClassName?: string;
  alt?: string;
}

export function UserAvatar({
  userId,
  name,
  photoUrl,
  className = "",
  sizeClassName = "w-8 h-8",
  textSizeClassName = "text-xs",
  alt = "Avatar"
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const liveProfile = useUserProfile(userId);

  const finalName = liveProfile?.name || name || 'User';
  const finalPhoto = (!imageError && (liveProfile?.photoUrl || photoUrl)) ? (liveProfile?.photoUrl || photoUrl) : null;

  // Extract initial
  const initial = (finalName.trim().charAt(0) || 'U').toUpperCase();

  if (finalPhoto) {
    return (
      <div 
        className={`relative shrink-0 rounded-full overflow-hidden border border-[#CFE4E3] dark:border-[#145250] bg-[#E7F1F1] dark:bg-[#0E4A47] ${sizeClassName} ${className}`}
      >
        <img
          src={finalPhoto}
          alt={alt || finalName}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback initial
  return (
    <div 
      className={`relative shrink-0 rounded-full bg-[#E7F1F1] dark:bg-[#062625] flex items-center justify-center text-[#0E7673] dark:text-[#38B794] font-bold border border-[#CFE4E3] dark:border-[#145250] ${sizeClassName} ${textSizeClassName} ${className}`}
      title={finalName}
    >
      {initial}
    </div>
  );
}
