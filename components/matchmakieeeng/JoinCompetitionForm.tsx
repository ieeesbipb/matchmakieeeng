"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type {
  Competition,
  Member,
} from "@/types/database";

interface JoinCompetitionFormProps {
  currentUser: Member;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinCompetitionForm({
  currentUser,
  onClose,
  onSuccess,
}: JoinCompetitionFormProps) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [isCustomComp, setIsCustomComp] = useState(false);
  const [customComp, setCustomComp] = useState({
    name: "",
    organizer: "",
    deadline: "",
    minMembers: "1",
    maxMembers: "3",
  });
  const [teamName, setTeamName] = useState("");
  const [maxMembers, setMaxMembers] = useState("3");
  const [hasTeam, setHasTeam] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [teamNote, setTeamNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exitActive, setExitActive] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
    fetchData();
  }, []);

  const fetchData = async () => {
    const [compsRes, membersRes] = await Promise.all([
      supabase
        .from("competitions")
        .select("*, competition_type:competition_types(*)")
        .order("name"),
      supabase.from("members").select("*").order("username"),
    ]);
    setCompetitions(compsRes.data ?? []);
    setMembers((membersRes.data ?? []).filter((m) => m.id !== currentUser.id));
  };

  const handleClose = () => {
    setExitActive(true);
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const filteredMembers = members.filter(
    (m) =>
      memberSearch &&
      (m.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.real_name.toLowerCase().includes(memberSearch.toLowerCase())),
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const maxLimit = isCustomComp ? (parseInt(customComp.maxMembers) || 3) : (selectedComp?.max_members ?? 3);
      if (hasTeam && selectedMembers.length + 1 > maxLimit) {
        alert(`Jumlah anggota (termasuk Ketua) melebihi batas maksimal lomba (${maxLimit} orang). Silakan kurangi anggota tim.`);
        setSubmitting(false);
        return;
      }

      let competitionId = selectedComp?.id;

      // Create custom competition if needed
      if (isCustomComp) {
        const { data: newComp } = await supabase
          .from("competitions")
          .insert({
            name: customComp.name,
            organizer: customComp.organizer,
            registration_deadline: customComp.deadline,
            max_members: parseInt(customComp.maxMembers),
            min_members: parseInt(customComp.minMembers),
            is_custom: true,
            created_by: currentUser.id,
          })
          .select()
          .single();
        competitionId = newComp?.id;
      }

      // Create team
      const { data: team } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          competition_id: competitionId,
          leader_id: currentUser.id,
          note: teamNote || null,
        })
        .select()
        .single();

      if (!team) throw new Error("Gagal membuat tim");

      // Add leader as member
      await supabase.from("team_members").insert({
        team_id: team.id,
        member_id: currentUser.id,
        status: "active",
      });

      // Add other members
      if (hasTeam && selectedMembers.length > 0) {
        const memberInserts = selectedMembers.map((m) => ({
          team_id: team.id,
          member_id: m.id,
          status: "pending" as const,
        }));
        const { data: insertedMembers, error: memberError } = await supabase
          .from("team_members")
          .insert(memberInserts)
          .select();

        if (memberError) throw memberError;

        if (insertedMembers && insertedMembers.length > 0) {
          const leaderName = currentUser.real_name || currentUser.username;
          const notificationInserts = insertedMembers.map((tm) => ({
            member_id: tm.member_id,
            team_member_id: tm.id,
            type: "team_invite",
            team_name: teamName,
            actor_name: leaderName,
            is_read: false,
          }));

          await supabase.from("notifications").insert(notificationInserts);
        }
      }

      setExitActive(true);
      setVisible(false);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 300);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#121820",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "white",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
    colorScheme: "dark" as const,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  const labelStyle = {
    display: "block" as const,
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "none",
        transition: "all 0.3s ease-in-out",
        padding: "16px",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "#1E2638",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 24px 32px",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          opacity: visible ? 1 : 0,
          transform: visible 
            ? "scale(1) translateY(0)" 
            : (exitActive ? "scale(0.95) translateY(-40px)" : "scale(0.95) translateY(40px)"),
          transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: "22px",
                margin: "0 0 4px",
              }}
            >
              Buat Tim
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.68)",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Langkah {step} dari 2
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "#121820",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              color: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "3px",
                borderRadius: "100px",
                background:
                  s <= step
                    ? "#16357B"
                    : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Competition select */}
            <div>
              <label style={labelStyle}>Pilih Lomba</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <button
                  onClick={() => setIsCustomComp(false)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: !isCustomComp
                      ? "rgba(22, 53, 123, 0.25)"
                      : "transparent",
                    border: `1px solid ${!isCustomComp ? "#16357B" : "rgba(255,255,255,0.08)"}`,
                    color: !isCustomComp ? "#93c5fd" : "rgba(255,255,255,0.72)",
                  }}
                >
                  Dari daftar
                </button>
                <button
                  onClick={() => setIsCustomComp(true)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: isCustomComp
                      ? "rgba(22, 53, 123, 0.25)"
                      : "transparent",
                    border: `1px solid ${isCustomComp ? "#16357B" : "rgba(255,255,255,0.08)"}`,
                    color: isCustomComp ? "#93c5fd" : "rgba(255,255,255,0.72)",
                  }}
                >
                  + Tambah sendiri
                </button>
              </div>

              {!isCustomComp ? (
                <select
                  style={selectStyle}
                  value={selectedComp?.id ?? ""}
                  onChange={(e) =>
                    setSelectedComp(
                      competitions.find((c) => c.id === e.target.value) ?? null,
                    )
                  }
                >
                  <option value="">-- Pilih lomba --</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.competition_type?.name || "Lainnya"}] {c.name} • {c.organizer}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={labelStyle}>Nama Lomba</label>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                        {customComp.name.length}/30
                      </span>
                    </div>
                    <input
                      style={inputStyle}
                      maxLength={30}
                      placeholder="Nama lomba..."
                      value={customComp.name}
                      onChange={(e) =>
                        setCustomComp((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={labelStyle}>Penyelenggara</label>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                        {customComp.organizer.length}/20
                      </span>
                    </div>
                    <input
                      style={inputStyle}
                      maxLength={20}
                      placeholder="Penyelenggara..."
                      value={customComp.organizer}
                      onChange={(e) =>
                        setCustomComp((p) => ({
                          ...p,
                          organizer: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Deadline Pendaftaran</label>
                        <input
                          type="date"
                          style={inputStyle}
                          value={customComp.deadline}
                          onChange={(e) =>
                            setCustomComp((p) => ({
                              ...p,
                              deadline: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Min</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          style={inputStyle}
                          placeholder="Min"
                          value={customComp.minMembers}
                          onChange={(e) =>
                            setCustomComp((p) => ({
                              ...p,
                              minMembers: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Max</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          style={inputStyle}
                          placeholder="Max"
                          value={customComp.maxMembers}
                          onChange={(e) =>
                            setCustomComp((p) => ({
                              ...p,
                              maxMembers: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const min = parseInt(customComp.minMembers) || 1;
                const max = parseInt(customComp.maxMembers) || 3;
                if (min < 1) {
                  alert("Jumlah anggota minimal harus setidaknya 1 orang");
                  return;
                }
                if (min > max) {
                  alert("Jumlah anggota minimal tidak boleh melebihi jumlah maksimal");
                  return;
                }
                setStep(2);
              }}
              disabled={
                !isCustomComp
                  ? !selectedComp
                  : !customComp.name ||
                  !customComp.organizer ||
                  !customComp.deadline ||
                  !customComp.minMembers ||
                  !customComp.maxMembers
              }
              style={{
                background: "#16357B",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                color: "white",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
                opacity: (!isCustomComp ? !selectedComp : !customComp.name || !customComp.organizer || !customComp.deadline || !customComp.minMembers || !customComp.maxMembers)
                  ? 0.5
                  : 1,
              }}
            >
              Lanjut
            </button>
          </div>
        )}

        {step === 2 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Team name */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Nama Tim</label>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", fontFamily: "monospace" }}>
                  {teamName.length}/70
                </span>
              </div>
              <input
                style={inputStyle}
                placeholder="Masukkan nama tim..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={70}
              />
            </div>

            {/* Max members */}
            <div>
              <label style={labelStyle}>Jumlah Anggota Maksimal</label>
              <input
                type="number"
                min="1"
                max="10"
                style={inputStyle}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
              />
            </div>

            {/* Has team */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={hasTeam}
                  onChange={(e) => setHasTeam(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#16357B",
                  }}
                />
                <span
                  style={{ color: "rgba(255,255,255,0.78)", fontSize: "14px" }}
                >
                  Saya sudah punya anggota tim
                </span>
              </label>
            </div>

            {hasTeam && (
              <div>
                <label style={labelStyle}>Tambah Anggota (cari username)</label>
                <input
                  style={inputStyle}
                  placeholder="Cari username atau nama..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                {filteredMembers.length > 0 && (
                  <div
                    style={{
                      background: "#121820",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      marginTop: "4px",
                      maxHeight: "160px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredMembers.slice(0, 8).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          const maxLimit = isCustomComp ? (parseInt(customComp.maxMembers) || 3) : (selectedComp?.max_members ?? 3);
                          if (selectedMembers.length + 1 >= maxLimit) {
                            alert(`Jumlah anggota (termasuk Ketua) tidak boleh melebihi batas maksimal lomba (${maxLimit} orang).`);
                            return;
                          }
                          if (
                            !selectedMembers.some((sm) => sm.id === m.id)
                          ) {
                            setSelectedMembers((p) => [
                              ...p,
                              m,
                            ]);
                          }
                          setMemberSearch("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.78)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "13px",
                        }}
                      >
                        <span>@{m.username}</span>
                        <span
                          style={{
                            color: "rgba(255,255,255,0.62)",
                            fontSize: "12px",
                          }}
                        >
                          {m.real_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedMembers.length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {selectedMembers.map((m, i) => (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(22, 53, 123, 0.15)",
                          border: "1px solid rgba(22, 53, 123, 0.4)",
                          borderRadius: "10px",
                          padding: "8px 12px",
                        }}
                      >
                        <span
                          style={{
                            color: "#93c5fd",
                            fontSize: "13px",
                            flex: 1,
                          }}
                        >
                          @{m.username}
                        </span>
                        <button
                          onClick={() =>
                            setSelectedMembers((p) =>
                              p.filter((_, idx) => idx !== i),
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "0 4px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Team Note */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={labelStyle}>Catatan Tim</label>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
                  {teamNote.length}/200
                </span>
              </div>
              <textarea
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "80px",
                }}
                placeholder="Tulis catatan tim (misal: butuh UI/UX designer, target juara, dll.)"
                maxLength={200}
                value={teamNote}
                onChange={(e) => setTeamNote(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "rgba(255,255,255,0.78)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ← Kembali
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!teamName || submitting}
                className="btn-aura-hover"
                style={{
                  flex: 2,
                  background: "#16357B",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                  opacity: !teamName ? 0.5 : 1,
                }}
              >
                <span className="relative z-10">
                  {submitting ? "Membuat tim..." : "Buat Tim"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
