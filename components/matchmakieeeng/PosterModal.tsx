"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface PosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export default function PosterModal({
  isOpen,
  onClose,
  imageUrl,
  title,
}: PosterModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
    >
      {/* Close Button - Positioned below the navbar */}
      <button
        onClick={onClose}
        className="absolute top-20 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 border border-white/10 transition-colors cursor-pointer flex items-center justify-center z-[10000]"
        title="Tutup"
      >
        <X size={18} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-full max-h-full flex items-center justify-center cursor-default mt-10"
      >
        <img
          src={imageUrl}
          alt={title}
          className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
}
