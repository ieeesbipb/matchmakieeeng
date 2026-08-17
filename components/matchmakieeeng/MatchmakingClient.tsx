"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Member, Team, Competition } from "@/types/database";
import { X, User, Pencil, Check, Bell, Flag, Trophy } from "lucide-react";
import TeamCard from "@/components/matchmakieeeng/TeamCard";
import CompetitionCard from "@/components/matchmakieeeng/CompetitionCard";
import JoinCompetitionForm from "@/components/matchmakieeeng/JoinCompetitionForm";
import NotificationPanel from "@/components/matchmakieeeng/NotificationPanel";
import Link from "next/link";

interface Props {
  currentUser: Member;
  initialTeams: Team[];
  initialCompetitions: Competition[];
  initialUnreadCount: number;
}

export default function MatchmakingClient({
  currentUser,
  initialTeams,
  initialCompetitions,
  initialUnreadCount,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userState, setUserState] = useState<Member>(currentUser);
  const [showProfile, setShowProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editWhatsapp, setEditWhatsapp] = useState(currentUser.wa_number || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState<'confirm' | 'sending' | 'success' | 'error'>('confirm');
  const [resetError, setResetError] = useState('');

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);

  const handleToggleEditUsername = () => {
    setIsEditingUsername((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => usernameInputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  const handleToggleEditWhatsapp = () => {
    setIsEditingWhatsapp((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => whatsappInputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [competitions, setCompetitions] =
    useState<Competition[]>(initialCompetitions);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [showForm, setShowForm] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMobileCompList, setShowMobileCompList] = useState(false);

  const [confirmJoinTeam, setConfirmJoinTeam] = useState<Team | null>(null);
  const [confirmLeaveTeam, setConfirmLeaveTeam] = useState<Team | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);
  const [confirmKickMember, setConfirmKickMember] = useState<{ team: Team, memberId: string, username: string } | null>(null);

  // Refetch data client-side (for realtime updates)
  const fetchData = useCallback(async () => {
    const [teamsRes, compsRes, notifsRes] = await Promise.all([
      supabase
        .from("teams")
        .select(
          `
          *,
          competition:competitions(*, competition_type:competition_types(*)),
          leader:members!teams_leader_id_fkey(*),
          members:team_members(*, member:members(*)),
          join_requests(*)
        `,
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("competitions")
        .select("*, competition_type:competition_types(*)")
        .eq("is_custom", false)
        .gte("registration_deadline", new Date().toISOString().split("T")[0])
        .order("registration_deadline"),

      supabase
        .from("notifications")
        .select("id")
        .eq("member_id", userState.id)
        .eq("is_read", false),
    ]);

    setTeams(teamsRes.data ?? []);
    setCompetitions(compsRes.data ?? []);
    setUnreadCount(notifsRes.data?.length ?? 0);
  }, [userState.id, supabase]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("matchmaking-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        fetchData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        fetchData,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `member_id=eq.${userState.id}`,
        },
        fetchData,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userState.id, fetchData, supabase]);

  const handleAskToJoin = async (teamId: string) => {
    try {
      // Find existing request
      const { data: existingRequests, error: findError } = await supabase
        .from("join_requests")
        .select("id")
        .eq("team_id", teamId)
        .eq("requester_id", userState.id);

      if (findError) throw findError;

      if (existingRequests && existingRequests.length > 0) {
        // If it exists (e.g. rejected), update it back to pending
        const { error: updateError } = await supabase
          .from("join_requests")
          .update({ status: "pending" })
          .eq("id", existingRequests[0].id);

        if (updateError) throw updateError;

        // Insert a new notification for the team leader
        const { data: teamData } = await supabase
          .from("teams")
          .select("leader_id")
          .eq("id", teamId)
          .single();

        if (teamData?.leader_id) {
          await supabase.from("notifications").insert({
            member_id: teamData.leader_id,
            type: "join_request",
            join_request_id: existingRequests[0].id
          });
        }
      } else {
        // Otherwise create a new request
        const { error: insertError } = await supabase.from("join_requests").insert({
          team_id: teamId,
          requester_id: userState.id,
          status: "pending",
        });

        if (insertError) throw insertError;
      }

      fetchData();
    } catch (err: any) {
      alert("Gagal mengirim permintaan: " + (err.message || "Terjadi kesalahan"));
    }
  };

  const handleCancelRequest = async (teamId: string) => {
    await supabase
      .from("join_requests")
      .update({ status: "cancelled" })
      .eq("team_id", teamId)
      .eq("requester_id", userState.id);
    fetchData();
  };

  const handleLeaveTeam = async (teamId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("member_id", userState.id);

    if (error) console.error("Error leaving team:", error);
    fetchData();
  };

  const handleKickMember = async (teamId: string, memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("member_id", memberId);

    if (error) console.error("Error kicking member:", error);
    fetchData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase.rpc('delete_team', { target_team_id: teamId });
      if (error) throw error;

      fetchData();
    } catch (err: any) {
      alert("Gagal menghapus tim: " + (err.message || "Terjadi kesalahan"));
    }
  };

  const handleUpdateNote = async (teamId: string, note: string) => {
    const { error } = await supabase
      .from("teams")
      .update({ note: note || null })
      .eq("id", teamId);

    if (error) {
      console.error("Error updating team note:", error);
      throw error;
    }
    fetchData();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      alert("Username tidak boleh kosong");
      return;
    }
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          username: editUsername.trim(),
          wa_number: editWhatsapp.trim() || null,
        })
        .eq("id", userState.id);

      if (error) throw error;

      setUserState({
        ...userState,
        username: editUsername.trim(),
        wa_number: editWhatsapp.trim() || null,
      });
      setShowProfile(false);
    } catch (err: any) {
      alert("Gagal memperbarui profil: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/member-login");
  };

  const handleSendResetEmail = async () => {
    if (!userState.email) {
      setResetError("Email tidak ditemukan");
      setResetStatus('error');
      return;
    }
    setResetStatus('sending');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userState.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetStatus('success');
    } catch (err: any) {
      setResetError(err.message || "Terjadi kesalahan");
      setResetStatus('error');
    }
  };

  // Categorize teams
  const myActiveTeams = teams.filter((t) =>
    t.members?.some(
      (m) => m.member_id === userState.id && m.status === "active",
    ),
  );
  const availableTeams = teams.filter(
    (t) =>
      !t.members?.some(
        (m) => m.member_id === userState.id && m.status === "active",
      ),
  );

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#121820] text-white flex flex-col">
      <style>{`
        .lomba-scroll-container {
          direction: rtl;
          overflow-y: auto;
        }
        .lomba-scroll-container > * {
          direction: ltr;
        }
        .lomba-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .lomba-scroll-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 99px;
        }
        .lomba-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(22, 53, 123, 0.7);
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .lomba-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #16357B;
        }
        /* Firefox */
        .lomba-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(22, 53, 123, 0.7) rgba(255, 255, 255, 0.02);
        }

        /* Animated Brand Aura */
        .brand-aura-container {
          position: relative;
          background: #121820;
          overflow: hidden;
        }
        .brand-aura-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(22, 53, 123, 0) 0%,
            rgba(22, 53, 123, 0.25) 25%,
            rgba(59, 130, 246, 0.2) 50%,
            rgba(22, 53, 123, 0.25) 75%,
            rgba(22, 53, 123, 0) 100%
          );
          background-size: 200% 100%;
          animation: aura-shift 8s linear infinite;
          opacity: 0.8;
        }
        .brand-aura-radial {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 60px;
          background: radial-gradient(
            circle,
            rgba(59, 130, 246, 0.22) 0%,
            rgba(22, 53, 123, 0.08) 50%,
            rgba(0, 0, 0, 0) 100%
          );
          filter: blur(12px);
          animation: aura-pulse 3s ease-in-out infinite alternate;
        }
        .brand-aura-border {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(59, 130, 246, 0.35) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          animation: aura-shift 6s linear infinite;
        }
        @keyframes aura-shift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: -200% 50%;
          }
        }
        @keyframes aura-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1.0;
          }
        }

        /* Button Hover Aura */
        .btn-aura-hover {
          position: relative !important;
          overflow: hidden !important;
          transition: all 0.3s ease !important;
        }
        .btn-aura-hover::after {
          content: '' !important;
          position: absolute !important;
          inset: 0 !important;
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0) 0%,
            rgba(59, 130, 246, 0.35) 50%,
            rgba(59, 130, 246, 0) 100%
          ) !important;
          background-size: 200% 100% !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease !important;
          pointer-events: none !important;
          z-index: 1 !important;
        }
        .btn-aura-hover:hover::after {
          opacity: 1 !important;
          animation: aura-shift 2s linear infinite !important;
        }
        .btn-aura-hover:hover {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4) !important;
        }
      `}</style>
      <div className="sticky top-0 left-0 right-0 z-50 flex flex-col shrink-0">
        <nav className="brand-aura-container transition-all duration-500 py-3 bg-[#121820]/90 backdrop-blur-[18px]">
          <div className="brand-aura-bg pointer-events-none" />
          <div className="brand-aura-radial pointer-events-none hidden md:block" />
          <div className="brand-aura-border pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center justify-between relative">
              <Link href="/" className="flex items-center space-x-2 group shrink-0">
                <span
                  aria-label="IEEE IPB Student Branch"
                  role="img"
                  className="block aspect-[679/116] w-32 shrink-0 bg-current sm:w-40 text-white [mask-image:url('/images/layout/Logo_IEEE_IPB.svg')] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/images/layout/Logo_IEEE_IPB.svg')] [-webkit-mask-position:left_center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]"
                />
              </Link>

              {/* Centered MatchmakIEEEng.png (Desktop Only) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
                <img
                  src="/images/matchmakieeeng/MatchmakIEEEng.png"
                  alt="MatchmakIEEEng Logo"
                  className="h-7 w-auto object-contain relative z-10 filter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-300"
                />
              </div>

              <div className="flex items-center gap-3 md:gap-8 shrink-0">
                <button
                  onClick={() => {
                    setEditUsername(userState.username);
                    setEditWhatsapp(userState.wa_number || "");
                    setIsEditingUsername(false);
                    setIsEditingWhatsapp(false);
                    setShowProfile(true);
                  }}
                  className="bg-transparent border-none flex items-center gap-1.5 text-white/70 text-xs cursor-pointer px-2 py-1 rounded-lg transition-colors duration-200 hover:bg-white/10"
                >
                  <User size={16} strokeWidth={2} className="text-white/60" />
                  <span>@{userState.username}</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Sub-header Brand Banner with Cool Aura & Animation (Mobile Only) */}
        <div className="brand-aura-container w-full flex justify-center py-4 shrink-0 md:hidden">
          <div className="brand-aura-bg pointer-events-none" />
          <div className="brand-aura-radial pointer-events-none" />
          <div className="brand-aura-border pointer-events-none" />
          <img
            src="/images/matchmakieeeng/MatchmakIEEEng.png"
            alt="MatchmakIEEEng Logo"
            className="h-7 w-auto object-contain relative z-10 filter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-300"
          />
        </div>
      </div>

      <div className="max-w-[1400px] w-full mx-auto px-3 md:px-6 flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 md:gap-8 min-h-0 md:overflow-hidden box-border">
        {/* LEFT: Teams */}
        <div className="flex flex-col gap-6 md:h-full md:overflow-y-auto md:pr-4 pb-16">
          {/* My Teams */}
          <div className="md:mb-10">
            <div className="flex items-center gap-3 mb-5 pt-6">
              <h2 className="text-white font-bold text-xl">
                My Teams
              </h2>
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative bg-[#1E2638] border border-white/10 rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors duration-200"
                >
                  <Bell size={18} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <NotificationPanel
                    currentUser={userState}
                    onClose={() => {
                      setShowNotifs(false);
                      fetchData();
                    }}
                  />
                )}
              </div>
            </div>

            {myActiveTeams.length === 0 ? (
              <div className="bg-[#1E2638] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <div className="flex justify-center mb-3">
                  <Flag size={32} className="text-white/30" />
                </div>
                <p className="text-white/70 text-sm">
                  Kamu belum di tim manapun
                </p>
              </div>
            ) : (
              <div className="team-grid grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 md:gap-3.5">
                {myActiveTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    currentUser={userState}
                    isMyTeam={true}
                    onAskToJoin={(t) => setConfirmJoinTeam(teams.find((x) => x.id === t) || null)}
                    onCancelRequest={handleCancelRequest}
                    onLeaveTeam={(t) => setConfirmLeaveTeam(teams.find((x) => x.id === t) || null)}
                    onDeleteTeam={(t) => setConfirmDeleteTeam(teams.find((x) => x.id === t) || null)}
                    onKickMember={(t, mId, uName) => setConfirmKickMember({ team: teams.find((x) => x.id === t)!, memberId: mId, username: uName })}
                    onUpdateNote={handleUpdateNote}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Available Teams */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-5">
              <h2 className="text-white font-bold text-xl">
                Available Teams
              </h2>
              <span className="text-white/60 font-normal text-sm">
                {availableTeams.length} tim
              </span>
            </div>

            {availableTeams.length === 0 ? (
              <div className="bg-[#1E2638] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <p className="text-white/70 text-sm">
                  Belum ada tim yang tersedia
                </p>
              </div>
            ) : (
              <div className="team-grid grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 md:gap-3.5">
                {availableTeams.map((team) => {
                  const isPending = (team as any).join_requests?.some((jr: any) => jr.requester_id === userState.id && jr.status === 'pending');

                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      currentUser={userState}
                      isPending={isPending}
                      onAskToJoin={(t) => setConfirmJoinTeam(teams.find((x) => x.id === t) || null)}
                      onCancelRequest={handleCancelRequest}
                      onLeaveTeam={(t) => setConfirmLeaveTeam(teams.find((x) => x.id === t) || null)}
                      onDeleteTeam={(t) => setConfirmDeleteTeam(teams.find((x) => x.id === t) || null)}
                      onKickMember={(t, mId, uName) => setConfirmKickMember({ team: teams.find((x) => x.id === t)!, memberId: mId, username: uName })}
                      onUpdateNote={handleUpdateNote}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Competitions */}
        <div className="hidden md:flex md:flex-col md:h-full min-h-0">
          {/* Stationary button and heading */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-[#16357B] border-none rounded-xl px-4 mt-6 py-4 text-white text-sm font-bold cursor-pointer mb-4 text-center hover:bg-[#16357B]/80 transition-colors duration-200 shrink-0 btn-aura-hover"
          >
            <span className="relative z-10">Ikut Lomba</span>
          </button>
          <h2 className="text-white font-bold text-xl mb-3 shrink-0">
            Lomba Aktif
          </h2>

          {/* Scrollable list with left-aligned custom scrollbar */}
          <div className="lomba-scroll-container flex-1 min-h-0 md:overflow-y-auto pr-1">
            <div className="pl-3">
              {competitions.length === 0 ? (
                <div className="bg-[#1E2638] border border-dashed border-white/10 rounded-2xl p-8 text-center">
                  <p className="text-white/70 text-xs">
                    Belum ada lomba aktif
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {competitions.slice(0, 8).map((comp) => (
                    <CompetitionCard key={comp.id} competition={comp} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <JoinCompetitionForm
          currentUser={userState}
          onClose={() => setShowForm(false)}
          onSuccess={fetchData}
        />
      )}



      {/* Confirm Join Modal */}
      {confirmJoinTeam && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setConfirmJoinTeam(null)}
        >
          <div
            className="bg-[#1E2638] border border-[#16357B]/60 rounded-[20px] p-8 max-w-[360px] w-[90%] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">
              Yakin mau join?
            </h3>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Kamu akan kirim permintaan ke{" "}
              <strong className="text-[#93c5fd] font-bold">
                {confirmJoinTeam.leader?.username}
              </strong>{" "}
              untuk join tim{" "}
              <strong className="text-white font-bold">{confirmJoinTeam.name}</strong>.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmJoinTeam(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleAskToJoin(confirmJoinTeam.id);
                  setConfirmJoinTeam(null);
                }}
                className="flex-1 bg-[#16357B] border-none rounded-xl py-2.5 text-white cursor-pointer text-sm font-semibold hover:bg-[#16357B]/80 transition-colors duration-200"
              >
                Kirim Permintaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Leave Team Modal */}
      {confirmLeaveTeam && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setConfirmLeaveTeam(null)}
        >
          <div
            className="bg-[#1E2638] border border-red-500/30 rounded-[20px] p-8 max-w-[360px] w-[90%] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">
              Keluar dari Tim?
            </h3>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Yakin mau keluar dari tim <strong className="text-white font-bold">{confirmLeaveTeam.name}</strong>?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmLeaveTeam(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleLeaveTeam(confirmLeaveTeam.id);
                  setConfirmLeaveTeam(null);
                }}
                className="flex-1 bg-red-500/15 border border-red-500/30 rounded-xl py-2.5 text-[#fca5a5] cursor-pointer text-sm font-semibold hover:bg-red-500/25 transition-colors duration-200"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Team Modal */}
      {confirmDeleteTeam && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setConfirmDeleteTeam(null)}
        >
          <div
            className="bg-[#1E2638] border border-red-500/30 rounded-[20px] p-8 max-w-[360px] w-[90%] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">
              Hapus Tim?
            </h3>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Yakin mau menghapus tim <strong className="text-white font-bold">{confirmDeleteTeam.name}</strong> secara permanen? Aksi ini tidak bisa dibatalkan!
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDeleteTeam(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleDeleteTeam(confirmDeleteTeam.id);
                  setConfirmDeleteTeam(null);
                }}
                className="flex-1 bg-red-500/15 border border-red-500/30 rounded-xl py-2.5 text-[#fca5a5] cursor-pointer text-sm font-semibold hover:bg-red-500/25 transition-colors duration-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Kick Member Modal */}
      {confirmKickMember && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setConfirmKickMember(null)}
        >
          <div
            className="bg-[#1E2638] border border-red-500/30 rounded-[20px] p-8 max-w-[360px] w-[90%] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">
              Keluarkan Anggota?
            </h3>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Yakin mau mengeluarkan <strong className="text-[#fca5a5] font-bold">{confirmKickMember.username}</strong> dari tim <strong className="text-white font-bold">{confirmKickMember.team.name}</strong>?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmKickMember(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleKickMember(confirmKickMember.team.id, confirmKickMember.memberId);
                  setConfirmKickMember(null);
                }}
                className="flex-1 bg-red-500/15 border border-red-500/30 rounded-xl py-2.5 text-[#fca5a5] cursor-pointer text-sm font-semibold hover:bg-red-500/25 transition-colors duration-200"
              >
                Ya, Keluarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-[#1E2638] border border-white/10 rounded-[20px] p-8 max-w-[400px] w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="text-white flex justify-center gap-2 font-bold text-lg mb-1">
                <span><User size={24} className="text-[#FFFFFF]" /></span>
                {userState.real_name || "Nama Lengkap"}
              </h3>
              <p className="text-white/60 text-xs m-0">
                @{userState.username}
              </p>
              <p className="text-white/60 text-xs m-0">
                {userState.email}
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={userState.real_name || ""}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white/40 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    disabled={!isEditingUsername}
                    className={`w-full border rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-none transition-all duration-200 ${isEditingUsername
                      ? "bg-[#121820] border-white/10 text-white focus:border-[#16357B]"
                      : "bg-white/5 border-white/5 text-white/50 cursor-not-allowed"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={handleToggleEditUsername}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all duration-200"
                  >
                    {isEditingUsername ? (
                      <Check size={14} />
                    ) : (
                      <Pencil size={14} />
                    )}
                  </button>
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <input
                    ref={whatsappInputRef}
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    disabled={!isEditingWhatsapp}
                    className={`w-full border rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-none transition-all duration-200 ${isEditingWhatsapp
                      ? "bg-[#121820] border-white/10 text-white focus:border-[#16357B]"
                      : "bg-white/5 border-white/5 text-white/50 cursor-not-allowed"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={handleToggleEditWhatsapp}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all duration-200"
                  >
                    {isEditingWhatsapp ? (
                      <Check size={14} />
                    ) : (
                      <Pencil size={14} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className={`flex-1 border-none rounded-xl py-2.5 text-white text-sm font-semibold transition-colors duration-200 ${updatingProfile
                    ? "bg-[#16357B]/50 cursor-not-allowed"
                    : "bg-[#16357B] cursor-pointer hover:bg-[#16357B]/80"
                    }`}
                >
                  {updatingProfile ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
              <div className="flex flex-col items-center gap-1 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetStatus('confirm');
                    setResetError('');
                    setShowResetConfirm(true);
                  }}
                  className="w-fit px-4 text-xs text-white hover:text-white/80 hover:bg-white/5 rounded-xl py-2 text-center cursor-pointer font-semibold transition-colors duration-200"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-fit px-4 text-xs text-red-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl py-2 cursor-pointer font-semibold transition-colors duration-200"
                >
                  Keluar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-md"
          onClick={() => {
            if (resetStatus !== 'sending') setShowResetConfirm(false);
          }}
        >
          <div
            className="bg-[#1E2638] border border-[#16357B]/60 rounded-[20px] p-8 max-w-[360px] w-[90%] text-center flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {resetStatus === 'confirm' && (
              <>
                <h3 className="text-white font-bold text-lg mb-2">
                  Atur Ulang Password?
                </h3>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Link reset password akan dikirim ke email kamu:<br />
                  <strong className="text-white font-bold">{userState.email || "email kamu"}</strong>
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSendResetEmail}
                    className="flex-1 bg-[#16357B] border-none rounded-xl py-2.5 text-white cursor-pointer text-sm font-semibold hover:bg-[#16357B]/80 transition-colors duration-200"
                  >
                    Kirim
                  </button>
                </div>
              </>
            )}

            {resetStatus === 'sending' && (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
                <p className="text-white/70 text-sm">Mengirim link reset password...</p>
              </div>
            )}

            {resetStatus === 'success' && (
              <>
                <h3 className="text-emerald-400 font-bold text-lg mb-2">
                  Link Dikirim!
                </h3>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Link reset password sudah dikirim ke email kamu. Silakan periksa inbox atau spam email IPB kamu.
                </p>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setShowProfile(false);
                  }}
                  className="w-full bg-[#16357B] border-none rounded-xl py-2.5 text-white cursor-pointer text-sm font-semibold hover:bg-[#16357B]/80 transition-colors duration-200"
                >
                  Tutup
                </button>
              </>
            )}

            {resetStatus === 'error' && (
              <>
                <h3 className="text-red-400 font-bold text-lg mb-2">
                  Gagal Mengirim
                </h3>
                <p className="text-red-300/80 text-sm mb-6 leading-relaxed">
                  {resetError || "Terjadi kesalahan"}
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 text-white/80 cursor-pointer text-sm font-medium hover:bg-white/10 transition-colors duration-200"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSendResetEmail}
                    className="flex-1 bg-[#16357B] border-none rounded-xl py-2.5 text-white cursor-pointer text-sm font-semibold hover:bg-[#16357B]/80 transition-colors duration-200"
                  >
                    Coba Lagi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating Sticky Action Bar */}
      <div className="mobile-floating-bar grid grid-cols-[8fr_2fr] gap-2.5 fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#16357B] border-none rounded-xl p-3.5 text-white text-sm font-bold cursor-pointer text-center shadow-lg shadow-black/50 hover:bg-[#16357B]/80 transition-colors duration-200"
        >
          Ikut Lomba
        </button>
        <button
          onClick={() => setShowMobileCompList(true)}
          className="bg-[#1E2638] border border-white/10 rounded-xl p-3.5 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-black/50 hover:bg-white/10 transition-colors duration-200"
          title="Daftar Lomba"
        >
          <Trophy size={20} className="text-amber-400" />
        </button>
      </div>

      {/* Mobile Competition List Overlay Modal */}
      {showMobileCompList && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[600] flex items-center justify-center p-4"
          onClick={() => setShowMobileCompList(false)}
        >
          <div
            className="bg-[#1E2638] border border-white/10 rounded-[20px] p-6 w-full max-w-[400px] max-h-[85vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold text-lg m-0">
                Lomba Aktif
              </h3>
              <button
                onClick={() => setShowMobileCompList(false)}
                className="bg-transparent border-none text-white cursor-pointer p-1 flex items-center justify-center hover:bg-white/10 rounded transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {competitions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/70 text-sm m-0">
                  Belum ada lomba aktif
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {competitions.slice(0, 8).map((comp) => (
                  <CompetitionCard key={comp.id} competition={comp} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
