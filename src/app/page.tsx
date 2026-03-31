"use client";

import { useState, useEffect, useCallback } from "react";
import StatsCards from "@/components/StatsCards";
import BusinessTable from "@/components/BusinessTable";
import CrmPipeline from "@/components/CrmPipeline";
import CategoryChart from "@/components/CategoryChart";
import CrawlButton from "@/components/CrawlButton";
import type { Business } from "@/lib/supabase";

type Stats = {
  totalBusinesses: number;
  emailStats: { total: number; sent: number; pending: number; failed: number };
  crmStats: {
    contacted: number;
    replied: number;
    meeting: number;
    contracted: number;
  };
  categoryCount: Record<string, number>;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"overview" | "businesses">("overview");
  const [filterEmail, setFilterEmail] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/analyze");
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchBusinesses = useCallback(async (p: number, emailOnly?: boolean) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (emailOnly) params.set("emailOnly", "true");
    const res = await fetch(`/api/businesses?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.data || []);
      setTotal(data.total || 0);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBusinesses(1, filterEmail);
  }, [fetchStats, fetchBusinesses, filterEmail]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchBusinesses(p, filterEmail);
  };

  const handleFilterEmailChange = (v: boolean) => {
    setFilterEmail(v);
    setPage(1);
    fetchBusinesses(1, v);
  };

  const handleSendEmail = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIds: ids }),
      });
      const data = await res.json();
      alert(data.message || "발송 완료");
      fetchStats();
      fetchBusinesses(page, filterEmail);
    } catch {
      alert("발송 중 오류 발생");
    } finally {
      setSending(false);
    }
  };

  const handleCrawlComplete = () => {
    fetchStats();
    fetchBusinesses(1);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              숏폼 영업 자동화
            </h1>
            <p className="text-sm text-gray-500">
              서울 지역 업체 크롤링 & 맞춤 영업이메일 발송
            </p>
          </div>
          <CrawlButton onComplete={handleCrawlComplete} />
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "overview"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            대시보드
          </button>
          <button
            onClick={() => setTab("businesses")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "businesses"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            업체 목록
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === "overview" ? (
          <>
            <StatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CrmPipeline stats={stats?.crmStats || null} />
              <CategoryChart data={stats?.categoryCount || null} />
            </div>
          </>
        ) : (
          <BusinessTable
            businesses={businesses}
            total={total}
            page={page}
            onPageChange={handlePageChange}
            onSendEmail={handleSendEmail}
            sending={sending}
            filterEmail={filterEmail}
            onFilterEmailChange={handleFilterEmailChange}
          />
        )}
      </main>
    </div>
  );
}
