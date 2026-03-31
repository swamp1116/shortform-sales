"use client";

import { useState } from "react";
import type { Business } from "@/lib/supabase";
import { ExternalLink, Mail, Copy, Check, Send } from "lucide-react";

type Props = {
  businesses: Business[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSendEmail: (ids: string[]) => void;
  sending: boolean;
  filterEmail: boolean;
  onFilterEmailChange: (v: boolean) => void;
  onDmStatusChange: (id: string, status: "sent" | "replied") => void;
  filterInstagram: boolean;
  onFilterInstagramChange: (v: boolean) => void;
};

export default function BusinessTable({
  businesses,
  total,
  page,
  onPageChange,
  onSendEmail,
  sending,
  filterEmail,
  onFilterEmailChange,
  onDmStatusChange,
  filterInstagram,
  onFilterInstagramChange,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const emailBusinesses = businesses.filter((b) => b.email);
  const selectedWithEmail = Array.from(selected).filter((id) =>
    businesses.find((b) => b.id === id && b.email)
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllWithEmail = () => {
    const emailIds = emailBusinesses.map((b) => b.id);
    const allSelected = emailIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        emailIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        emailIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleCopyDm = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">업체 목록 ({total}개)</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterInstagram}
              onChange={(e) => onFilterInstagramChange(e.target.checked)}
              className="rounded"
            />
            인스타 있는 업체만
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterEmail}
              onChange={(e) => onFilterEmailChange(e.target.checked)}
              className="rounded"
            />
            이메일 있는 업체만
          </label>
        </div>
        <button
          onClick={() => onSendEmail(selectedWithEmail)}
          disabled={selectedWithEmail.length === 0 || sending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
        >
          <Send className="w-4 h-4" />
          {sending ? "발송 중..." : `이메일 발송 (${selectedWithEmail.length})`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left w-10">
                <input
                  type="checkbox"
                  onChange={toggleAllWithEmail}
                  checked={
                    emailBusinesses.length > 0 &&
                    emailBusinesses.every((b) => selected.has(b.id))
                  }
                  disabled={emailBusinesses.length === 0}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">업체명</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">업종</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">인스타</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">DM 문구</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">DM 상태</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">이메일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {businesses.map((biz) => (
              <tr key={biz.id} className="hover:bg-gray-50 transition">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(biz.id)}
                    onChange={() => toggleSelect(biz.id)}
                    disabled={!biz.email}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-3 font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    {biz.name}
                    {biz.website && (
                      <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{biz.category}</span>
                </td>
                <td className="px-3 py-3">
                  {biz.instagram ? (
                    <a
                      href={biz.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 font-medium text-xs underline"
                    >
                      {biz.instagram.replace("https://www.instagram.com/", "@").replace("https://instagram.com/", "@").replace(/\/$/, "")}
                    </a>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-3 py-3 max-w-[250px]">
                  {biz.dm_message ? (
                    <div className="flex items-start gap-1">
                      <p className="text-xs text-gray-600 line-clamp-2 flex-1" title={biz.dm_message}>
                        {biz.dm_message}
                      </p>
                      <button
                        onClick={() => handleCopyDm(biz.id, biz.dm_message!)}
                        className={`shrink-0 p-1 rounded text-xs transition ${
                          copiedId === biz.id
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title="DM 복사"
                      >
                        {copiedId === biz.id ? (
                          <span className="flex items-center gap-0.5"><Check className="w-3 h-3" /> 복사됨</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : biz.instagram ? (
                    <span className="text-gray-300 text-xs">생성 대기</span>
                  ) : (
                    <span className="text-gray-200">-</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {biz.instagram ? (
                    <div className="flex items-center gap-1">
                      {biz.dm_status === "sent" ? (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">발송완료</span>
                      ) : biz.dm_status === "replied" ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">답장옴</span>
                      ) : (
                        <button
                          onClick={() => onDmStatusChange(biz.id, "sent")}
                          disabled={!biz.dm_message}
                          className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs font-medium hover:bg-orange-100 transition disabled:opacity-30"
                        >
                          발송대기
                        </button>
                      )}
                      {biz.dm_status === "sent" && (
                        <button
                          onClick={() => onDmStatusChange(biz.id, "replied")}
                          className="px-1.5 py-0.5 text-xs text-purple-600 hover:bg-purple-50 rounded transition"
                          title="답장 수신 표시"
                        >
                          답장옴
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-200">-</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {biz.email ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <Mail className="w-3 h-3" />
                      {biz.email}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-30">이전</button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-30">다음</button>
        </div>
      )}
    </div>
  );
}
