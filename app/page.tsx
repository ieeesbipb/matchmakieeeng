import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MatchmakingClient from "@/components/matchmakieeeng/MatchmakingClient";
import { createClient } from "@/utils/supabase/server";
import type { Competition, Member, Team } from "@/types/database";

export default async function MatchmakingPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/member-login");
  }

  if (user.email && !user.email.endsWith("@apps.ipb.ac.id")) {
    redirect("/member-login?error=domain");
  }

  let currentUser: Member | null = null;

  const { data: memberById } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  currentUser = memberById;

  if (!currentUser && user.email) {
    const { data: memberByEmail } = await supabase
      .from("members")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    currentUser = memberByEmail;
  }

  if (!currentUser) {
    redirect("/member-login");
  }

  const today = new Date().toISOString().split("T")[0];

  const [teamsRes, competitionsRes, unreadRes] = await Promise.all([
    supabase
      .from("teams")
      .select(
        `
        *,
        competition:competitions(*, competition_type:competition_types(*)),
        leader:members!teams_leader_id_fkey(*),
        members:team_members(*, member:members(*))
      `,
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("competitions")
      .select("*, competition_type:competition_types(*)")
      .eq("is_custom", false)
      .gte("registration_deadline", today)
      .order("registration_deadline"),

    supabase
      .from("notifications")
      .select("id")
      .eq("member_id", currentUser.id)
      .eq("is_read", false),
  ]);

  return (
    <MatchmakingClient
      currentUser={currentUser}
      initialTeams={(teamsRes.data ?? []) as Team[]}
      initialCompetitions={(competitionsRes.data ?? []) as Competition[]}
      initialUnreadCount={unreadRes.data?.length ?? 0}
    />
  );
}
