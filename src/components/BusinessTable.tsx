"use client";

import { useState } from "react";
import type { Business } from "@/lib/supabase";
import { ExternalLink, Mail, Send, Loader2 } from "lucide-react";

type Props = {
  businesses: Business[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSendEmail: (ids: string[]) => void;
  sending: boolean;
  filterEmail: boolean;
  onFilterEmailChange: (v: boolean) => void;
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
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const handleSend = () => {
    if (selectedWithEmail.length === 0) return;
    onSendEmail(selectedWithEmail);
    setSelected(new Set());
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">업체 목록 ({total}개)</h2>
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
          onClick={handleSend}
          disabled={selectedWithEmail.length === 0 || sending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending
            ? "AI 이메일 생성 & 발송 중..."
            : `선택 발송 (${selectedWithEmail.length})`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={toggleAllWithEmail}
                  checked={
                    emailBusinesses.length > 0 &&
                    emailBusinesses.every((b) => selected.has(b.id))
                  }
                  disabled={emailBusinesses.length === 0}
                  className="rounded"
                  title="이메일 있는 업체 전체 선택"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                업체명
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                업종
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                주소
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                전화
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                이메일
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                SNS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {businesses.map((biz) => (
              <tr
                key={biz.id}
                className={`hover:bg-gray-50 transition ${
                  !biz.email ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(biz.id)}
                    onChange={() => toggleSelect(biz.id)}
                    disabled={!biz.email}
                    className="rounded"
                    title={biz.email ? "선택" : "이메일 없음"}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    {biz.name}
                    {biz.website && (
                      <a
                        href={biz.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                    {biz.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                  {biz.address}
                </td>
                <td className="px-4 py-3 text-gray-600">{biz.phone}</td>
                <td className="px-4 py-3">
                  {biz.email ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Mail className="w-3 h-3" />
                      {biz.email}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {biz.instagram && (
                      <a
                        href={biz.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:text-pink-600 text-xs font-medium"
                      >
                        IG
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
