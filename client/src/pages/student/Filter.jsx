import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCategoryList } from "@/pages/admin/course/categories";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";

// Search filters in one card: sort-by-price select + the category list
// from the API (built-ins + instructor-created, built-in fallback) — the
// same source the course forms save from, so a filter option always
// matches the values courses are stored with.
//
// On phones the card COLLAPSES behind its "Filter Options" header
// (chevron toggle): the full card used to fill the entire first phone
// screen before the first result appeared. From md up it is always
// open and sticky, exactly as before. Category rows are 40px tall so
// they are proper tap targets (they were 28px).
const Filter = ({ handleFilterChange }) => {
  const categories = useCategoryList();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortByPrice, setSortByPrice] = useState("");
  const [open, setOpen] = useState(false);

  const handleCategoryChange = (categoryId) => {
    // Compute the next list first, then update both states as plain event
    // handlers. The old code called the parent's setState (via
    // handleFilterChange) from INSIDE this component's state updater —
    // updaters must be pure; React warned "Cannot update a component while
    // rendering a different component" and could double-fire the callback.
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    setSelectedCategories(newCategories);
    handleFilterChange(newCategories, sortByPrice);
  };

  const selectByPriceHandler = (selectedValue) => {
    setSortByPrice(selectedValue);
    handleFilterChange(selectedCategories, selectedValue);
  };

  return (
    <Card className="h-fit w-full shrink-0 p-5 md:sticky md:top-24 md:w-64">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[40px] w-full items-center justify-between gap-3 md:pointer-events-none md:min-h-0"
      >
        <h2 className="font-semibold">Filter Options</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <div className={cn(open ? "block" : "hidden", "md:block")}>
        <div className="mt-4">
          <Label htmlFor="sort-by-price" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sort by price
          </Label>
          <Select onValueChange={selectByPriceHandler}>
            <SelectTrigger id="sort-by-price" className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort by price</SelectLabel>
                <SelectItem value="low">Low to High</SelectItem>
                <SelectItem value="high">High to Low</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Separator className="my-5" />
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </h3>
          <div className="space-y-0.5">
            {categories.map((category) => (
              <div
                key={category.value}
                className="flex min-h-[40px] items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
              >
                <Checkbox
                  id={category.value}
                  checked={selectedCategories.includes(category.value)}
                  onCheckedChange={() => handleCategoryChange(category.value)}
                />
                <Label
                  htmlFor={category.value}
                  className="flex-1 cursor-pointer text-sm font-medium leading-none"
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Filter;
