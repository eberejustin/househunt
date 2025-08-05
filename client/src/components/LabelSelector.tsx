import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label, insertLabelSchema } from "@shared/schema";
import { Plus, X, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface LabelSelectorProps {
  apartmentId: string;
  selectedLabels: Label[];
  onLabelsChange?: () => void;
}

const createLabelSchema = insertLabelSchema.extend({
  name: z.string().min(1, "Label name is required").max(50, "Label name must be less than 50 characters"),
});

type CreateLabelFormData = z.infer<typeof createLabelSchema>;

const PREDEFINED_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green  
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16", // lime
  "#EC4899", // pink
  "#6B7280", // gray
];

export function LabelSelector({ apartmentId, selectedLabels, onLabelsChange }: LabelSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available labels
  const { data: allLabels = [] } = useQuery<Label[]>({
    queryKey: ["/api/labels"],
  });

  // Create label mutation
  const createLabelMutation = useMutation({
    mutationFn: async (data: CreateLabelFormData) => {
      return apiRequest("/api/labels", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Label created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to create label",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add label to apartment mutation
  const addLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      return apiRequest(`/api/apartments/${apartmentId}/labels`, "POST", { labelId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      onLabelsChange?.();
      toast({ title: "Label added to apartment" });
    },
    onError: (error) => {
      toast({
        title: "Failed to add label",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove label from apartment mutation
  const removeLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      return apiRequest(`/api/apartments/${apartmentId}/labels/${labelId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      onLabelsChange?.();
      toast({ title: "Label removed from apartment" });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove label",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateLabelFormData>({
    resolver: zodResolver(createLabelSchema),
    defaultValues: {
      name: "",
      color: PREDEFINED_COLORS[0],
    },
  });

  const handleAddLabel = (labelId: string) => {
    const isAlreadySelected = selectedLabels.some(label => label.id === labelId);
    if (!isAlreadySelected) {
      addLabelMutation.mutate(labelId);
    }
  };

  const handleRemoveLabel = (labelId: string) => {
    removeLabelMutation.mutate(labelId);
  };

  const handleCreateLabel = (data: CreateLabelFormData) => {
    createLabelMutation.mutate(data);
  };

  const availableLabels = allLabels.filter(
    label => !selectedLabels.some(selected => selected.id === label.id)
  );

  return (
    <div className="space-y-3" data-testid="label-selector">
      {/* Current Labels */}
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map(label => (
          <Badge
            key={label.id}
            style={{ backgroundColor: label.color, color: 'white' }}
            className="flex items-center gap-1"
            data-testid={`label-badge-${label.id}`}
          >
            <span>{label.name}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 p-0 hover:bg-white/20"
              onClick={() => handleRemoveLabel(label.id)}
              data-testid={`remove-label-${label.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      {/* Add Label Section */}
      <div className="flex items-center gap-2">
        {availableLabels.length > 0 && (
          <Select onValueChange={handleAddLabel}>
            <SelectTrigger className="w-48" data-testid="select-label">
              <SelectValue placeholder="Add a label..." />
            </SelectTrigger>
            <SelectContent>
              {availableLabels.map(label => (
                <SelectItem key={label.id} value={label.id} data-testid={`label-option-${label.id}`}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: label.color }}
                    />
                    <span>{label.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="create-label-button">
              <Plus className="h-4 w-4 mr-1" />
              New Label
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Label</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreateLabel)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  {...form.register("name")}
                  placeholder="Enter label name..."
                  data-testid="input-label-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        form.watch("color") === color ? "border-gray-800" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => form.setValue("color", color)}
                      data-testid={`color-option-${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="cancel-create-label"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLabelMutation.isPending}
                  data-testid="submit-create-label"
                >
                  {createLabelMutation.isPending ? "Creating..." : "Create Label"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}