"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { PublicReviewList } from "@/components/public-review-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicReviewItem } from "@/lib/reviews-service";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

type MinderReviewsBrowserProps = {
  reviews: PublicReviewItem[];
  pageSize?: number;
};

export function MinderReviewsBrowser({
  reviews,
  pageSize = 6,
}: MinderReviewsBrowserProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  const ratingCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const option of RATING_OPTIONS) {
      counts.set(option, 0);
    }
    for (const review of reviews) {
      const rounded = Math.round(review.rating);
      if (counts.has(rounded)) {
        counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
      }
    }
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedRating === null) {
      return reviews;
    }
    return reviews.filter((review) => Math.round(review.rating) === selectedRating);
  }, [reviews, selectedRating]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedReviews = filteredReviews.slice(start, start + pageSize);

  const ratingLabel =
    selectedRating === null
      ? `All ratings (${reviews.length})`
      : `${selectedRating} / 5 (${ratingCounts.get(selectedRating) ?? 0})`;

  function handleFilterChange(rating: number | null) {
    setSelectedRating(rating);
    setCurrentPage(1);
    setJumpPageInput("1");
  }

  function handlePrevPage() {
    const next = Math.max(1, safePage - 1);
    setCurrentPage(next);
    setJumpPageInput(String(next));
  }

  function handleNextPage() {
    const next = Math.min(totalPages, safePage + 1);
    setCurrentPage(next);
    setJumpPageInput(String(next));
  }

  function handleJumpToPage() {
    const raw = Number(jumpPageInput);
    if (!Number.isFinite(raw)) return;
    const target = Math.max(1, Math.min(totalPages, Math.trunc(raw)));
    setCurrentPage(target);
    setJumpPageInput(String(target));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Previous page"
                disabled={safePage <= 1}
                onClick={handlePrevPage}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="min-w-24 text-center">
                <p className="text-xl font-semibold text-foreground">{safePage}</p>
                <p className="text-xs text-muted-foreground">of {totalPages}</p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Next page"
                disabled={safePage >= totalPages}
                onClick={handleNextPage}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="mx-auto flex w-full max-w-xs items-center gap-2">
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJumpToPage();
                  }
                }}
                placeholder="Page"
              />
              <Button type="button" variant="outline" onClick={handleJumpToPage}>
                Go
              </Button>
            </div>
          </div>
        ) : null}

        <PublicReviewList title="All reviews" reviews={pagedReviews} />
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="shadow-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Filter by rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label htmlFor="reviews-rating-filter" className="text-xs text-muted-foreground">
              Rating
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="reviews-rating-filter"
                  type="button"
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <span className="truncate text-left">{ratingLabel}</span>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => handleFilterChange(null)}
                >
                  All ratings ({reviews.length})
                </DropdownMenuItem>
                {RATING_OPTIONS.map((rating) => (
                  <DropdownMenuItem
                    key={rating}
                    className="cursor-pointer"
                    onSelect={() => handleFilterChange(rating)}
                  >
                    {rating} / 5 ({ratingCounts.get(rating) ?? 0})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
