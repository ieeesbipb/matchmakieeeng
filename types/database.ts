export interface Member {
  id: string;
  username: string;
  real_name: string;
  email?: string | null;
  wa_number?: string | null;
  created_at?: string | null;
}

export interface CompetitionType {
  id: string;
  name: string;
  created_at?: string | null;
}

export interface Competition {
  id: string;
  name: string;
  organizer: string;
  registration_deadline: string;
  max_members: number | null;
  min_members: number | null;
  competition_type_id?: string | null;
  poster_url?: string | null;
  detail_link?: string | null;
  is_custom?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  competition_type?: CompetitionType | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  member_id: string;
  status: "active" | "pending" | "cancelled" | "accepted" | "rejected" | string;
  created_at?: string | null;
  member?: Member | null;
}

export interface Team {
  id: string;
  name: string;
  competition_id?: string | null;
  leader_id: string;
  note?: string | null;
  created_at?: string | null;
  competition?: Competition | null;
  leader?: Member | null;
  members?: TeamMember[] | null;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  requester_id: string;
  status: "pending" | "cancelled" | "accepted" | "rejected" | string;
  created_at?: string | null;
  requester?: Member | null;
  team?: Team | null;
}

export interface Notification {
  id: string;
  member_id: string;
  join_request_id?: string | null;
  team_member_id?: string | null;
  type: "join_request" | "request_accepted" | "request_rejected" | "team_invite" | "team_deleted" | "member_left" | "new_member" | string;
  is_read: boolean;
  team_name?: string | null;
  actor_name?: string | null;
  created_at: string;
  join_request?: JoinRequest | null;
  team_member?: TeamMember | null;
}
