import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, SkeletonTable } from "@/ui/skeleton";

const meta: Meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { className: "h-4 w-48" },
};

export const Table: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <SkeletonTable rows={4} />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  ),
};
