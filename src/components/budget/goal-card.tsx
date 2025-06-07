
import type { BudgetGoal } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: BudgetGoal;
  onEdit: (goal: BudgetGoal) => void;
  onDelete: (goalId: string) => void;
  className?: string;
  defaultIcon?: LucideIcon;
  disabled?: boolean; // To disable edit/delete based on subscription
}

export function GoalCard({ goal, onEdit, onDelete, className, defaultIcon, disabled = false }: GoalCardProps) {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const IconComponent = defaultIcon || Target;

  return (
    <Card className={cn("shadow-lg flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ease-out", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <IconComponent className="h-5 w-5 mr-2 text-primary" />
            {goal.name}
          </CardTitle>
        </div>
        {goal.description && <CardDescription className="pt-1">{goal.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-2">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} aria-label={`${goal.name} progress`} className="h-3"/>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current: <span className="font-medium text-foreground">₹{goal.currentAmount.toLocaleString()}</span></span>
          <span className="text-muted-foreground">Target: <span className="font-medium text-foreground">₹{goal.targetAmount.toLocaleString()}</span></span>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(goal)} disabled={disabled} title={disabled ? "Activate subscription to edit" : "Edit Goal"}>
          <Edit3 className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(goal.id)} disabled={disabled} title={disabled ? "Activate subscription to delete" : "Delete Goal"}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
