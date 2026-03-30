"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export default function CrawlButton({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [crawling, setCrawling] = useState(false);
  const [status, setStatus] = useState("");

  const startCrawl = async () => {
    setCrawling(true);
    setStatus("크롤링 시작...");

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPerKeyword: 50 }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message);
        onComplete();
      } else {
        setStatus(`오류: ${data.error}`);
      }
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setCrawling(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={startCrawl}
        disabled={crawling}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700 transition"
      >
        {crawling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        {crawling ? "크롤링 중..." : "업체 크롤링 시작"}
      </button>
      {status && <span className="text-sm text-gray-600">{status}</span>}
    </div>
  );
}
