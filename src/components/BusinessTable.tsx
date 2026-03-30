"use client";

import { useState } from "react";
import type { Business } from "@/lib/supabase";
import { ExternalLink, Mail } from "lucide-react";

type Props = {
  businesses: Business[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSendEmail: (ids: string[]) => void;
  sending: boolean;
};

export default function BusinessTable({
  businesses,
  total,
  page,
  onPageChange,
  onSendEmail,
  sending,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === businesses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(businesses.map((b) => b.id)));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold">업체 목록 ({total}개)</h2>
        <button
          onClick={() => onSendEmail(Array.from(selected))}
          disabled={selected.size === 0 || sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
        >
          {sending ? "발송 중..." : `선택 발송 (${selected.size})`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={
                    selected.size === businesses.length &&
                    businesses.length > 0
                  }
                  className="rounded"
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
              <tr key={biz.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(biz.id)}
                    onChange={() => toggleSelect(biz.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 font-medium">
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
