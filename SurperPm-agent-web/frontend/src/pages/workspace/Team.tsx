import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { User, ChevronDown, ChevronRight, UserCircle, Users, Cpu } from "lucide-react";

interface TeamMember {
  login: string;
  avatar_url: string;
}

interface TeamProfile {
  team_name: string;
  description: string;
  members: TeamMember[];
  languages: Record<string, number>;
  team_md_exists: boolean;
  team_md: string;
}

type ViewMode = "team" | "personal" | "agent";

export function TeamContent() {
  const [view, setView] = useState<ViewMode>("team");
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<TeamProfile>({
    queryKey: ["setup", "team-profile"],
    queryFn: () => api.get<TeamProfile>("/setup/team-profile"),
  });


  return (
    <div className="space-y-6 max-w-2xl">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("team")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all rounded-sm ${
            view === "team"
              ? "bg-primary text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users size={14} />
          Member
        </button>
        <button
          onClick={() => setView("personal")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all rounded-sm ${
            view === "personal"
              ? "bg-primary text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <UserCircle size={14} />
          Personal
        </button>
        <button
          onClick={() => setView("agent")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all rounded-sm ${
            view === "agent"
              ? "bg-primary text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Cpu size={14} />
          Agent
        </button>
      </div>

      {view === "team" && (
        <TeamView profile={profile} isLoading={isLoading} isError={isError} />
      )}
      {view === "personal" && <PersonalView />}
      {view === "agent" && <AgentView />}
    </div>
  );
}

function TeamView({
  profile,
  isLoading,
  isError,
}: {
  profile?: TeamProfile;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading team info...</div>;
  }

  if (isError || !profile) {
    return (
      <Card className="max-w-lg">
        <Card.Content>
          <p className="text-sm text-muted-foreground py-4">
            Unable to load team profile. Make sure a knowledge repository is
            configured and you have access.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const title = profile.team_md
    ? (profile.team_md.match(/^#\s+(.+)$/m)?.[1] || profile.team_name)
    : profile.team_name;
  const desc = profile.description || "";

  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-bold">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>

      <div>
        <Text as="h3" className="text-sm font-bold mb-2">
          Members ({profile.members.length})
        </Text>
        {profile.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members found.</p>
        ) : (
          <div className="space-y-2">
            {profile.members.map((member) => (
              <MemberRow key={member.login} member={member} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PersonalView() {
  return (
    <div className="text-xs text-muted-foreground py-4">
      <p>Personal profile is collected through the Discuss onboarding.</p>
      <p className="mt-1">Go to <a href="/" className="text-foreground underline">Discuss</a> and type "闯关" to set up your profile.</p>
    </div>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="w-8 h-8 border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.login}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={14} />
          )}
        </div>
        <span className="font-mono text-sm font-medium flex-1">
          {member.login}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50">
          <div className="flex items-center gap-3 py-3">
            <div className="w-12 h-12 border border-border bg-muted flex items-center justify-center overflow-hidden">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.login}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <p className="font-mono text-sm font-medium">{member.login}</p>
              <a
                href={`https://github.com/${member.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                github.com/{member.login}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgentInfo { name: string; cc_api_url: string; cc_api_token?: string | null; project: string; description?: string | null; status: string }

function AgentView() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [project, setProject] = useState("default");

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => api.get<AgentInfo[]>("/agents") });
  const regMut = useMutation({
    mutationFn: () => api.post("/agents", { name, cc_api_url: url, cc_api_token: token || null, project }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); setName(""); setUrl(""); setToken(""); },
  });
  const delMut = useMutation({ mutationFn: (n: string) => api.delete(`/agents/${n}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }) });
  const pingMut = useMutation({ mutationFn: (n: string) => api.get(`/agents/${n}/ping`), onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }) });

  return (
    <div className="space-y-4">
      <Card>
        <Card.Content className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-mac" /></div>
            <div><Label className="text-xs mb-1 block">cc-connect API URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.100:8765" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Token</Label><Input type="password" value={token} onChange={(e) => setToken(e.target.value)} /></div>
            <div><Label className="text-xs mb-1 block">Project</Label><Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="default" /></div>
          </div>
          <Button size="sm" onClick={() => regMut.mutate()} disabled={!name.trim() || !url.trim() || regMut.isPending}>
            {regMut.isPending ? "Registering..." : "Register Agent"}
          </Button>
        </Card.Content>
      </Card>
      {agents.map((a) => (
        <Card key={a.name}>
          <Card.Content>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.name}</span>
                  <Badge variant={a.status === "online" ? "solid" : "outline"} size="sm">{a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.cc_api_url}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => pingMut.mutate(a.name)}>Ping</Button>
                <Button variant="outline" size="sm" onClick={() => delMut.mutate(a.name)}>Delete</Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      ))}
      {agents.length === 0 && <p className="text-xs text-muted-foreground">No remote agents registered.</p>}
    </div>
  );
}
