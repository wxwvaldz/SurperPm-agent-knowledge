import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { SshKeyDisplay } from "@/components/settings/ssh-key-display";
import { SecretsManager } from "@/components/settings/secrets-manager";

type Tab = "general" | "ssh" | "secrets";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "ssh", label: "SSH Key" },
  { id: "secrets", label: "Secrets" },
];

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const { data: workspaces = [] } = useQuery(workspaceListOptions());

  if (!slug) return null;

  const workspace = workspaces.find((w) => w.slug === slug);

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "general" && (
          <GeneralTab workspaceName={workspace?.name ?? slug} />
        )}
        {activeTab === "ssh" && <SshKeyDisplay workspaceSlug={slug} />}
        {activeTab === "secrets" && <SecretsManager workspaceSlug={slug} />}
      </div>
    </div>
  );
}

function GeneralTab({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Workspace Name</label>
        <input
          type="text"
          value={workspaceName}
          readOnly
          className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Workspace name editing is not available yet.
        </p>
      </div>
    </div>
  );
}
