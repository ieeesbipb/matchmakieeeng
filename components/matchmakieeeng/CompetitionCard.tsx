"use client";
import { useState } from "react";
import type { Competition } from "@/types/database";
import { Award, Users, AlertTriangle } from "lucide-react";
import PosterModal from "./PosterModal";

interface CompetitionCardProps {
  competition: Competition;
}

export default function CompetitionCard({ competition }: CompetitionCardProps) {
  const [showPosterModal, setShowPosterModal] = useState(false);
  const deadline = new Date(competition.registration_deadline);
  const now = new Date();
  const daysLeft = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isUrgent = daysLeft <= 7;

  return (
    <div className="flex items-center bg-[#1E2638] border border-white/8 hover:border-[#16357B] rounded-2xl p-3 gap-3 transition-all duration-200 min-h-[110px] w-full">
      {/* Poster (Left Side Box) */}
      <div
        onClick={() => competition.poster_url && setShowPosterModal(true)}
        className={`w-20 h-24 bg-[#121820]/30 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/5 ${
          competition.poster_url ? "cursor-pointer hover:border-blue-500/50 transition-colors" : ""
        }`}
      >
        {competition.poster_url ? (
          <img
            src={competition.poster_url}
            alt={competition.name}
            className="w-full h-full object-contain rounded-xl"
          />
        ) : (
          <Award className="w-6 h-6 text-[#93c5fd] opacity-60" />
        )}
      </div>

      {/* Content (Right Side) */}
      <div className="flex-1 flex flex-col min-w-0 justify-between py-1">
        <div className="min-w-0">
          {/* Category / Type */}
          <div className="text-[10px] font-bold tracking-wider uppercase text-[#93c5fd] leading-none mb-1.5">
            {competition.competition_type?.name ?? "Lomba"}
          </div>

          {/* Name */}
          <h3 className="text-white font-bold text-sm leading-snug mb-0.5 line-clamp-2">
            {competition.name}
          </h3>

          {/* Organizer */}
          <p className="text-white/60 text-[11px] m-0 leading-tight line-clamp-1">
            {competition.organizer}
          </p>
        </div>

        {/* Footer (member range, countdown, and detail button) */}
        <div className="flex justify-between items-end mt-2 pt-2 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50 pr-2">
            {competition.max_members && (
              <div className="flex items-center gap-1">
                <Users size={12} className="text-white/40" />
                <span>
                  {(() => {
                    const min = competition.min_members ?? 1;
                    const max = competition.max_members;
                    if (min === max) return `${max} Anggota`;
                    return `${min} - ${max} Anggota`;
                  })()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {isUrgent && <AlertTriangle size={11} className="text-[#f87171]" />}
              <span className={isUrgent ? "text-[#f87171] font-semibold" : ""}>
                {daysLeft > 0 ? `${daysLeft} hari lagi` : "Tutup"}
              </span>
            </div>
          </div>

          {competition.detail_link && (
            <a
              href={competition.detail_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#93c5fd] hover:text-white transition-colors bg-[#16357B]/40 hover:bg-[#16357B] px-3.5 py-1 rounded-lg border border-[#16357B]/50 shrink-0 leading-none"
            >
              Detail
            </a>
          )}
        </div>
      </div>

      {/* Poster Lightbox Modal */}
      {competition.poster_url && (
        <PosterModal
          isOpen={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          imageUrl={competition.poster_url}
          title={competition.name}
        />
      )}
    </div>
  );
}
