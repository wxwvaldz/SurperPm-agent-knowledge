import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SshKeyDisplayProps {
  workspaceSlug: string;
}

export function SshKeyDisplay({ workspaceSlug }: SshKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ssh-public-key", workspaceSlug],
    queryFn: () =>
      api.get<{ public_key: string }>(
        `/workspaces/${workspaceSlug}/ssh-public-key`
      ),
  });

  const publicKey = data?.public_key ?? "";

  const handleCopy = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        Loading SSH key...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load SSH key: {(error as Error).message}
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="text-muted-foreground text-sm">
        No SSH key generated for this workspace yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add this public key to your Git hosting provider (GitHub, GitLab, etc.)
        to allow SuperPmAgent to access your repositories.
      </p>
      <div className="relative">
        <textarea
          readOnly
          value={publicKey}
          rows={4}
          className="w-full rounded-md border border-border bg-muted/50 p-3 font-mono text-xs resize-none focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
