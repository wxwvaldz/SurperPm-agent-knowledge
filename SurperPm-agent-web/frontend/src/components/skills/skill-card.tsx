import { Wrench, Trash2 } from "lucide-react";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import type { SkillSummary } from "@/lib/schemas/skill";

interface SkillCardProps {
  skill: SkillSummary;
  onClick: () => void;
  onDelete?: (skill: SkillSummary) => void;
}

export function SkillCard({ skill, onClick, onDelete }: SkillCardProps) {
  return (
    <Card className="cursor-pointer hover:border-primary hover:shadow-[4px_4px_0_0_#000] transition-all">
      <Card.Content>
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 border-2 border-border bg-primary shrink-0 shadow-[2px_2px_0_0_#000]"
            onClick={onClick}
          >
            <Wrench size={18} />
          </div>
          <div className="flex-1 min-w-0" onClick={onClick}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-head text-sm font-bold truncate">
                {skill.name}
              </span>
            </div>
            {skill.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {skill.description}
              </p>
            )}
            {skill.tags && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="surface" size="sm">{skill.tags}</Badge>
              </div>
            )}
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(skill);
              }}
              title="删除"
              className="shrink-0"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
