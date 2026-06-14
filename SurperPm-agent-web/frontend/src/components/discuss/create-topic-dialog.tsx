import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { topicKeys } from "@/lib/queries/topics";
import { standaloneTopicKeys } from "@/lib/queries/topics-standalone";
import { Dialog } from "@/components/retroui/Dialog";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Text } from "@/components/retroui/Text";

interface CreateTopicDialogProps {
  goalId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTopicDialog({
  goalId,
  open,
  onOpenChange,
}: CreateTopicDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      goalId
        ? api.post(`/goals/${goalId}/topics`, body)
        : api.post("/topics", body),
    onSuccess: () => {
      if (goalId) {
        queryClient.invalidateQueries({ queryKey: topicKeys.all(goalId) });
      } else {
        queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
      }
      setName("");
      setDescription("");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Text as="h3" className="text-sm">
            New Topic
          </Text>
        </Dialog.Header>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <Label htmlFor="topic-name" className="mb-1 block text-xs">
              Name
            </Label>
            <Input
              id="topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. auth-module"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="topic-desc" className="mb-1 block text-xs">
              Description
            </Label>
            <Input
              id="topic-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional..."
            />
          </div>
          <Dialog.Footer>
            <Dialog.Close
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
