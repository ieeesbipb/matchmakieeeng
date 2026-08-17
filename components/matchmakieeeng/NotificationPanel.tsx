"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Notification, Member } from "@/types/database";
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  Mail,
  Inbox
} from "lucide-react";

const getNotificationIcon = (type: string) => {
  const size = 14;
  switch (type) {
    case "join_request":
      return <UserPlus size={size} style={{ color: "#fbbf24" }} />;
    case "team_invite":
      return <Mail size={size} style={{ color: "#fbbf24" }} />;
    case "request_accepted":
      return <CheckCircle2 size={size} style={{ color: "#4ade80" }} />;
    case "new_member":
      return <UserPlus size={size} style={{ color: "#4ade80" }} />;
    case "request_rejected":
      return <XCircle size={size} style={{ color: "#f87171" }} />;
    case "team_deleted":
      return <AlertTriangle size={size} style={{ color: "#f87171" }} />;
    case "member_left":
    case "member_kicked":
    case "member_kicked_team":
      return <LogOut size={size} style={{ color: "#f87171" }} />;
    default:
      return <Mail size={size} style={{ color: "#93c5fd" }} />;
  }
};

interface NotificationPanelProps {
  currentUser: Member;
  onClose: () => void;
}

export default function NotificationPanel({
  currentUser,
  onClose,
}: NotificationPanelProps) {
  const supabase = createClient();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        join_request:join_requests(
          *,
          requester:members(*),
          team:teams(*, competition:competitions(*))
        ),
        team_member:team_members(
          *,
          member:members(*),
          team:teams(*, leader:members(*), competition:competitions(*))
        )
      `
      )
      .eq("member_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) console.error("Error fetching notifications:", error);
    setNotifs(data ?? []);
    setLoading(false);

    // Mark all as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("member_id", currentUser.id)
      .eq("is_read", false);
  };

  const handleAccept = async (joinRequestId: string) => {
    // Check if team is full first
    const { data: req } = await supabase
      .from("join_requests")
      .select("*, team:teams(*, members:team_members(*), competition:competitions(*))")
      .eq("id", joinRequestId)
      .maybeSingle();

    if (req && req.team) {
      const activeCount = req.team.members?.filter((m: any) => m.status === "active").length ?? 0;
      const maxLimit = req.team.competition?.max_members ?? 3;
      if (activeCount >= maxLimit) {
        alert(`Gagal menerima: Tim sudah penuh (maksimal ${maxLimit} anggota termasuk ketua).`);
        return;
      }
    }

    await supabase
      .from("join_requests")
      .update({ status: "accepted" })
      .eq("id", joinRequestId);
    fetchNotifs();
  };

  const handleReject = async (joinRequestId: string) => {
    await supabase
      .from("join_requests")
      .update({ status: "rejected" })
      .eq("id", joinRequestId);
    fetchNotifs();
  };

  const handleAcceptInvite = async (teamMemberId: string) => {
    // Check if team is full first
    const { data: memberRecord } = await supabase
      .from("team_members")
      .select("*, team:teams(*, members:team_members(*), competition:competitions(*))")
      .eq("id", teamMemberId)
      .maybeSingle();

    if (memberRecord && memberRecord.team) {
      const activeCount = memberRecord.team.members?.filter((m: any) => m.status === "active").length ?? 0;
      const maxLimit = memberRecord.team.competition?.max_members ?? 3;
      if (activeCount >= maxLimit) {
        alert(`Gagal menerima undangan: Tim sudah penuh (maksimal ${maxLimit} anggota termasuk ketua).`);
        return;
      }
    }

    await supabase
      .from("team_members")
      .update({ status: "active" })
      .eq("id", teamMemberId);
    fetchNotifs();
  };

  const handleRejectInvite = async (teamMemberId: string) => {
    await supabase
      .from("team_members")
      .update({ status: "rejected" })
      .eq("id", teamMemberId);
    fetchNotifs();
  };

  const typeLabel: Record<string, string> = {
    join_request: "Minta Join",
    request_accepted: "Diterima",
    request_rejected: "Ditolak",
    team_deleted: "Tim Dihapus",
    member_left: "Anggota Keluar",
    member_kicked: "Dikeluarkan",
    member_kicked_team: "Anggota Keluar",
    new_member: "Anggota Baru",
    team_invite: "Undangan Tim",
  };

  return (
    <>
      {/* Invisible backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default"
        onClick={onClose}
      />

      {/* Floating panel container */}
      <div
        className="absolute top-[calc(100%+12px)] left-[-100px] sm:left-0 w-[380px] max-w-[calc(100vw-32px)] max-h-[450px] bg-[#1E2638] border border-white/10 rounded-[20px] shadow-2xl p-5 overflow-y-auto z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              color: "white",
              fontWeight: 700,
              fontSize: "16px",
              margin: 0,
            }}
          >
            Notifikasi
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.72)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div
            style={{
              color: "rgba(255,255,255,0.68)",
              textAlign: "center",
              padding: "40px 0",
            }}
          >
            Memuat...
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <Inbox size={40} style={{ color: "rgba(255,255,255,0.25)" }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.68)" }}>
              Belum ada notifikasi
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {notifs.map((n) => {
              const req = n.join_request as any;
              const invite = n.team_member as any;

              return (
                <div
                  key={n.id}
                  style={{
                    background: n.is_read ? "#121820" : "rgba(22, 53, 123, 0.15)",
                    border: `1px solid ${n.is_read ? "rgba(255,255,255,0.08)" : "rgba(22, 53, 123, 0.4)"}`,
                    borderRadius: "14px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {getNotificationIcon(n.type)}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color:
                            n.type === "join_request" || n.type === "team_invite"
                              ? "#fbbf24"
                              : n.type === "request_accepted" || n.type === "new_member"
                                ? "#4ade80"
                                : "#f87171",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {typeLabel[n.type] || n.type}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        fontSize: "11px",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {new Date(n.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* 1. Join Request */}
                  {n.type === "join_request" && req && (
                    <>
                      <p
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "13px",
                          margin: "0 0 10px",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: "#93c5fd" }}>
                          @{req.requester?.username}
                        </strong>{" "}
                        ({req.requester?.real_name}) minta join tim{" "}
                        <strong style={{ color: "white" }}>
                          {n.team_name || req.team?.name || "[Tim Telah Dihapus]"}
                        </strong>
                      </p>
                      {req.status === "pending" ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleAccept(req.id)}
                            style={{
                              flex: 1,
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.3)",
                              borderRadius: "8px",
                              padding: "7px",
                              color: "#4ade80",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Terima
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            style={{
                              flex: 1,
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              borderRadius: "8px",
                              padding: "7px",
                              color: "#fca5a5",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 500,
                            color:
                              req.status === "accepted"
                                ? "#4ade80"
                                : req.status === "rejected"
                                  ? "#f87171"
                                  : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {req.status === "accepted"
                             ? "Permintaan disetujui"
                             : req.status === "rejected"
                               ? "Permintaan ditolak"
                               : "Dibatalkan"}
                        </span>
                      )}
                    </>
                  )}

                  {/* 2. Team Invitation */}
                  {n.type === "team_invite" && (
                    <>
                      <p
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "13px",
                          margin: "0 0 10px",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: "#93c5fd" }}>
                          @{n.actor_name || invite?.team?.leader?.username || "Seseorang"}
                        </strong>{" "}
                        mengundangmu untuk bergabung ke tim{" "}
                        <strong style={{ color: "white" }}>
                          {n.team_name || invite?.team?.name || "[Tim Telah Dihapus]"}
                        </strong>
                      </p>
                      {!invite || invite.status === "rejected" ? (
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#f87171" }}>
                          Undangan ditolak
                        </span>
                      ) : invite.status === "active" ? (
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#4ade80" }}>
                          Undangan diterima
                        </span>
                      ) : invite.status === "cancelled" ? (
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>
                          Undangan dibatalkan
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            style={{
                              flex: 1,
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.3)",
                              borderRadius: "8px",
                              padding: "7px",
                              color: "#4ade80",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Terima
                          </button>
                          <button
                            onClick={() => handleRejectInvite(invite.id)}
                            style={{
                              flex: 1,
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              borderRadius: "8px",
                              padding: "7px",
                              color: "#fca5a5",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* 3. Request Accepted/Rejected */}
                  {(n.type === "request_accepted" || n.type === "request_rejected") && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Permintaan join tim{" "}
                      <strong style={{ color: "white" }}>
                        {n.team_name || req?.team?.name || "[Tim Telah Dihapus]"}
                      </strong>{" "}
                      {n.type === "request_accepted" ? "diterima!" : "ditolak."}
                    </p>
                  )}

                  {/* 4. Team Deleted */}
                  {n.type === "team_deleted" && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Tim <strong style={{ color: "white" }}>{n.team_name}</strong> telah dihapus oleh ketua tim.
                    </p>
                  )}

                  {/* 5. Member Left / Kicked */}
                  {n.type === "member_left" && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "#93c5fd" }}>@{n.actor_name}</strong> telah keluar dari tim <strong style={{ color: "white" }}>{n.team_name}</strong>.
                    </p>
                  )}

                  {n.type === "member_kicked" && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Anda telah dikeluarkan dari tim <strong style={{ color: "white" }}>{n.team_name}</strong> oleh ketua tim.
                    </p>
                  )}

                  {n.type === "member_kicked_team" && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "#93c5fd" }}>@{n.actor_name}</strong> telah dikeluarkan dari tim <strong style={{ color: "white" }}>{n.team_name}</strong> oleh ketua tim.
                    </p>
                  )}

                  {/* 6. New Member Joined */}
                  {n.type === "new_member" && (
                    <p
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "#93c5fd" }}>@{n.actor_name}</strong> baru saja bergabung dengan tim <strong style={{ color: "white" }}>{n.team_name}</strong>.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
