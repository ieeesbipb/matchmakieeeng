"use client";
import { useState } from "react";
import type { Team, Member } from "@/types/database";
import { Crown } from "lucide-react";

interface TeamCardProps {
  team: Team;
  currentUser: Member;
  isMyTeam?: boolean;
  isPending?: boolean;
  onAskToJoin?: (teamId: string) => void;
  onCancelRequest?: (teamId: string) => void;
  onLeaveTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onKickMember?: (teamId: string, memberId: string, username: string) => void;
  onUpdateNote?: (teamId: string, note: string) => Promise<void>;
}

export default function TeamCard({
  team,
  currentUser,
  isMyTeam,
  isPending,
  onAskToJoin,
  onCancelRequest,
  onLeaveTeam,
  onDeleteTeam,
  onKickMember,
  onUpdateNote,
}: TeamCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNote, setTempNote] = useState(team.note || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!onUpdateNote) return;
    setIsSaving(true);
    try {
      await onUpdateNote(team.id, tempNote);
      setIsEditingNote(false);
    } catch (err: any) {
      alert("Gagal menyimpan catatan: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSaving(false);
    }
  };
  const minMembers = team.competition?.min_members ?? 1;
  const maxMembers = team.competition?.max_members ?? 3;
  const currentCount =
    team.members?.filter((m) => m.status === "active").length ?? 0;
  const isLeader = team.leader_id === currentUser.id;
  const isMember = team.members?.some(
    (m) => m.member_id === currentUser.id && m.status === "active",
  );

  const waLink = team.leader?.wa_number
    ? `https://wa.me/${team.leader.wa_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${team.leader.real_name}, aku mau join tim kamu "${team.name}" untuk lomba ${team.competition?.name}!`)}`
    : null;

  return (
    <div
      className={`bg-[#1E2638] rounded-2xl p-4 relative h-fit transition-all duration-200 border hover:border-[#16357B] `}
    >
      {/* Header */}
      <div className="flex flex-col mb-2">
        {team.competition?.competition_type?.name && (
          <div className="text-[10px] font-bold tracking-wider uppercase text-[#93c5fd] leading-none mb-1.5">
            {team.competition.competition_type.name}
          </div>
        )}
        <div className="flex justify-between items-start gap-3">
          <div className="my-auto">
            <h3 className="text-white font-semibold flex items-center gap-2 flex-wrap text-[15px] m-0">
              {team.name}
              {isLeader && (
                <span className="inline-flex items-center justify-center border border-amber-500 text-[#fbbf24] text-[10px] font-bold px-2 py-1 rounded-full tracking-wider leading-none">
                  KETUA
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center justify-center border border-amber-500  text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-full leading-none">
                  PENDING
                </span>
              )}
            </h3>
          </div>

          {/* Member count & Actions */}
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold font-mono whitespace-nowrap translate-y-[1px] ${currentCount < minMembers
                ? "text-amber-400"
                : currentCount >= maxMembers
                  ? "text-[#f87171]"
                  : "text-[#4ade80]"
                }`}
            >
              {currentCount}/{maxMembers}
            </span>

            {(isLeader || (isMember && !isLeader)) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="bg-transparent border-none text-white/70 text-base cursor-pointer px-2 py-1 rounded hover:bg-white/5 flex items-center whitespace-nowrap leading-none  justify-center"
                >
                  ⋮
                </button>

                {showMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                    />
                    <div className="absolute top-full right-0 bg-[#1E2638] border border-white/8 rounded-lg p-1 mt-1 min-w-[120px] z-10 shadow-lg shadow-black/50">
                      {isLeader && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onDeleteTeam?.(team.id);
                          }}
                          className="w-full text-left bg-transparent border-none text-red-300 px-3 py-2 text-xs font-medium cursor-pointer rounded hover:bg-red-500/10"
                        >
                          Hapus Tim
                        </button>
                      )}
                      {isMember && !isLeader && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onLeaveTeam?.(team.id);
                          }}
                          className="w-full text-left bg-transparent border-none text-red-300 px-3 py-2 text-xs font-medium cursor-pointer rounded hover:bg-red-500/10"
                        >
                          Keluar Tim
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-white/68 text-xs mb-2">
        {team.competition?.name}
      </p>

      {/* Members */}
      <div className="mb-3">
        <p className="text-white/62 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
          Anggota
        </p>
        <div className="flex flex-wrap gap-1.5">
          {team.members
            ?.filter((m) => m.status === "active")
            .map((m) => (
              <div
                key={m.id}
                className={`group relative inline-flex items-center gap-1 border rounded-lg px-2.5 py-0.5 text-xs select-none cursor-default ${m.member_id === team.leader_id
                  ? "bg-[#16357B]/60 text-[#93c5fd]"
                  : "bg-white/10 text-white/78"
                  }`}
                tabIndex={0}
              >
                {m.member?.username ?? "unknown"}
                {m.member_id === team.leader_id && (
                  <Crown size={12} className="text-amber-400 ml-1" />
                )}
                {isLeader && m.member_id !== team.leader_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onKickMember?.(team.id, m.member_id, m.member?.username ?? "unknown");
                    }}
                    className="bg-transparent border-none text-white/50 text-sm cursor-pointer px-0.5 ml-0.5 flex items-center justify-center hover:text-red-300"
                  >
                    ×
                  </button>
                )}
                <span className="invisible opacity-0 group-hover:visible group-focus:visible group-hover:opacity-100 group-focus:opacity-100 bg-[#121820] border border-[#16357B] text-white rounded-lg py-1 px-2.5 text-xs absolute bottom-[120%] left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-150 z-10 md:bottom-[120%] md:top-auto bottom-auto top-[120%] group-active:visible group-active:opacity-100">
                  {m.member?.real_name ?? "-"}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Team Note */}
      {(team.note || isLeader) && (
        <div className="mb-3">
          <p className="text-white/62 text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex justify-between items-center">
            <span>Catatan Tim</span>
            {isLeader && (
              <button
                onClick={() => {
                  setTempNote(team.note || "");
                  setIsEditingNote(!isEditingNote);
                }}
                className="bg-transparent border-none text-[#93c5fd] text-[11px] cursor-pointer px-1"
              >
                {team.note ? "Edit" : "+ Tambah"}
              </button>
            )}
          </p>
          {isEditingNote ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Tulis catatan tim (misal: butuh UI/UX designer, target juara)..."
                maxLength={200}
                rows={2}
                className="w-full bg-[#121820] border border-white/14 rounded-lg p-2 text-white text-xs resize-none outline-none focus:border-[#16357B]"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">
                  {tempNote.length}/200
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setIsEditingNote(false);
                      setTempNote(team.note || "");
                    }}
                    className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-white/70 text-[11px] cursor-pointer hover:bg-white/10"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className="bg-[#16357B] border-none rounded-md px-2.5 py-0.5 text-white text-[11px] font-semibold cursor-pointer hover:bg-[#16357B]/80"
                  >
                    {isSaving ? "Simpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${team.note ? "text-white/88 not-italic" : "text-white/44 italic"
                }`}
            >
              {team.note || "Belum ada catatan tim."}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isMyTeam && !isMember && !isPending && currentCount < maxMembers && (
        <button
          onClick={() => onAskToJoin?.(team.id)}
          className="w-full bg-[#121820]/50 rounded-xl p-2 text-[#93c5fd] text-xs font-semibold cursor-pointer transition-all duration-200 hover:bg-[#16357B]/20 btn-aura-hover"
        >
          <span className="relative z-10">Gabung</span>
        </button>
      )}

      {isPending && (
        <div className="flex gap-2 w-full">
          <button
            onClick={() => onCancelRequest?.(team.id)}
            className="flex-1 bg-red-500/8 border border-red-500/20 rounded-xl p-2 text-red-300 text-xs font-semibold cursor-pointer hover:bg-red-500/15"
          >
            Batalkan Permintaan
          </button>
          {waLink && (
            <button
              onClick={() => window.open(waLink, "_blank")}
              className="flex-1 bg-green-500/12 border border-green-500/25 rounded-xl p-2 text-[#4ade80] text-xs font-semibold cursor-pointer hover:bg-green-500/20"
            >
              WhatsApp
            </button>
          )}
        </div>
      )}
    </div>
  );
}
