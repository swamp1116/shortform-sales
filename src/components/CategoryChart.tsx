"use client";

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
];

export default function CategoryChart({
  data,
}: {
  data: Record<string, number> | null;
}) {
  if (!data || Object.keys(data).length === 0) return null;

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">업종별 분포</h2>
      <div className="space-y-3">
        {sorted.map(([category, count], i) => (
          <div key={category} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-24 text-right truncate">
              {category}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
              <div
                className={`${COLORS[i % COLORS.length]} h-6 rounded-full transition-all flex items-center justify-end pr-2`}
                style={{ width: `${(count / max) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
