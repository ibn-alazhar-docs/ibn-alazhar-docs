import type { Meta, StoryObj } from "@storybook/react";
import { Heading } from "@/components/ui/heading";

const meta: Meta = {
  title: "UI/Heading",
  component: Heading,
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: { type: "select" },
      options: [1, 2, 3, 4, 5, 6],
    },
    color: {
      control: { type: "select" },
      options: ["default", "primary", "gold"],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Level1: Story = {
  args: {
    children: "مرحباً بكم في ابن الأزهر",
    level: 1,
    color: "default",
  },
};

export const Level2: Story = {
  args: {
    children: "عنوان فرعي",
    level: 2,
    color: "primary",
  },
};

export const GoldColor: Story = {
  args: {
    children: "عنوان ذهبي",
    level: 3,
    color: "gold",
  },
};

export const AllLevels: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1}>Level 1 — العنوان الرئيسي</Heading>
      <Heading level={2}>Level 2 — عنوان فرعي</Heading>
      <Heading level={3}>Level 3 — عنوان أصغر</Heading>
      <Heading level={4}>Level 4 — عنوان مكون</Heading>
      <Heading level={5}>Level 5 — عنوان صغير</Heading>
      <Heading level={6}>Level 6 — أصغر عنوان</Heading>
    </div>
  ),
};
