"use client";

import { Building2, Send, Users, MessageCircle } from "lucide-react";

type Stats = {
  totalBusinesses: number;
  emailStats: { total: number; sent: number; pending: number; failed: number };
  crmStats: {
    contacted: number;
    replied: number;
    meeting: number;
    contracted: number;
  };
  dmStats?: { total: number; pending: number; sent: number; replied: number };
};

export default function StatsCards({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const cards = [
    {
      title: "수집 업체",
      value: stats.totalBusinesses.toLocaleString(),
      icon: Building2,
      color: "bg-blue-500",
    },
    {
      title: "DM 발송완료",
      value: (stats.dmStats?.sent || 0).toLocaleString(),
      sub: `대기 ${stats.dmStats?.pending || 0} | 답장 ${stats.dmStats?.replied || 0}`,
      icon: MessageCircle,
      color: "bg-pink-500",
    },
    {
      title: "이메일 발송",
      value: stats.emailStats.sent.toLocaleString(),
      icon: Send,
      color: "bg-green-500",
    },
    {
      title: "답장/계약",
      value: (
        (stats.dmStats?.replied || 0) + stats.crmStats.contracted
      ).toLocaleString(),
      icon: Users,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-3xl font-bold mt-1">{card.value}</p>
              {"sub" in card && card.sub && (
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              )}
            </div>
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
