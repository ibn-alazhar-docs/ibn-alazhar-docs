"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";

interface Document {
  id: string;
  title: string;
  mimeType: string;
  status: string;
  createdAt: Date;
}

interface ActivityChartProps {
  recentDocuments: Document[];
}

const COLORS = ["#1a5c3a", "#CA8A04", "#2563eb", "#dc2626"];

export function ActivityChart({ recentDocuments }: ActivityChartProps) {
  const t = useTranslations("dashboard");

  // Prepare data for line chart (documents over time)
  const documentsByDate = recentDocuments.reduce(
    (acc, doc) => {
      const date = new Date(doc.createdAt).toLocaleDateString("ar-SA");
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    },
    [] as { date: string; count: number }[],
  );

  // Prepare data for pie chart (document types)
  const documentsByType = recentDocuments.reduce(
    (acc, doc) => {
      const type = doc.mimeType === "application/pdf" ? "PDF" : "صورة";
      const existing = acc.find((item) => item.name === type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: type, value: 1 });
      }
      return acc;
    },
    [] as { name: string; value: number }[],
  );

  if (recentDocuments.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Activity Line Chart */}
      <div className="rounded-2xl border border-line bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-primary-color">{t("activityOverTime")}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={documentsByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#1a5c3a"
                strokeWidth={2}
                dot={{ fill: "#1a5c3a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Document Types Pie Chart */}
      <div className="rounded-2xl border border-line bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-primary-color">{t("documentTypes")}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={documentsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {documentsByType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
