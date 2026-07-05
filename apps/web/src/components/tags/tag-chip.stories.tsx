import type { Meta, StoryObj } from "@storybook/react";
import { TagChip } from "@/components/tags/tag-chip";

const meta: Meta = {
  title: "Tags/TagChip",
  component: TagChip,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md"],
    },
    selected: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    id: "1",
    name: "فقه",
    color: "#16A34A",
    size: "sm",
  },
};

export const Selected: Story = {
  args: {
    id: "2",
    name: "حديث",
    color: "#CA8A04",
    size: "sm",
    selected: true,
  },
};

export const MediumSize: Story = {
  args: {
    id: "3",
    name: "عقيدة",
    color: "#2563EB",
    size: "md",
  },
};

export const WithRemove: Story = {
  args: {
    id: "4",
    name: "تربية",
    color: "#DC2626",
    size: "sm",
    onRemove: () => alert("Removed!"),
  },
};

export const AllColors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TagChip id="1" name="فقه" color="#16A34A" />
      <TagChip id="2" name="حديث" color="#CA8A04" />
      <TagChip id="3" name="عقيدة" color="#2563EB" />
      <TagChip id="4" name="تربية" color="#DC2626" />
      <TagChip id="5" name="أدب" color="#7C3AED" />
      <TagChip id="6" name="فلسفة" color="#0891B2" />
    </div>
  ),
};
