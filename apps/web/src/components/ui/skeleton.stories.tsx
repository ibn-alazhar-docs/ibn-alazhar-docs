import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { className: "h-4 w-48" },
};

export const TextLines: Story = {
  render: () => <SkeletonText lines={4} />,
};

export const Card: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonCard />
    </div>
  ),
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
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  ),
};
