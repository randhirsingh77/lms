import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCategoryMutation } from "@/features/api/courseApi";
import { Loader2, Plus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useCategoryList } from "./categories";

// Category picker for the course forms. The list comes from the API
// (built-ins + instructor-created); "Create new category" swaps the
// picker for a small inline form, and the freshly created category is
// selected immediately so the instructor can keep going.
const CategorySelect = ({ id, value, onChange }) => {
  const categories = useCategoryList();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createCategory, { isLoading }] = useCreateCategoryMutation();

  // A course saved before the list existed can carry a value the list
  // doesn't know — still show it as the selected option.
  const options =
    value && !categories.some((c) => c.value === value)
      ? [...categories, { value, label: value }]
      : categories;

  const saveNewCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await createCategory(name).unwrap();
      toast.success(res?.message || "Category created.");
      onChange(res.category.value);
      setNewName("");
      setCreating(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create category.");
    }
  };

  if (creating) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            id={id}
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveNewCategory();
              }
            }}
            placeholder="New category name"
            className="h-11"
            maxLength={100}
          />
          <Button
            type="button"
            className="h-11 shrink-0"
            disabled={isLoading || !newName.trim()}
            onClick={saveNewCategory}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
          >
            Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The new category becomes available everywhere, including the
          student search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Category</SelectLabel>
            {options.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        className="h-9 px-2 text-sm"
        onClick={() => setCreating(true)}
      >
        <Plus className="mr-1 h-4 w-4" /> Create new category
      </Button>
    </div>
  );
};

export default CategorySelect;
