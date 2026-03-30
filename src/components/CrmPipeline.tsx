"use client";

type CrmStats = {
  contacted: number;
  replied: number;
  meeting: number;
  contracted: number;
};

const stages = [
  { key: "contacted", label: "연락 완료", color: "bg-blue-500" },
  { key: "replied", label: "답변 수신", color: "bg-yellow-500" },
  { key: "meeting", label: "미팅 진행", color: "bg-orange-500" },
  { key: "contracted", label: "계약 완료", color: "bg-green-500" },
] as const;

export default function CrmPipeline({ stats }: { stats: CrmStats | null }) {
  if (!stats) return null;
  const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">CRM 파이프라인</h2>
      <div className="grid grid-cols-4 gap-4">
        {stages.map((stage) => {
          const value = stats[stage.key];
          const pct = Math.round((value / total) * 100);
          return (
            <div key={stage.key} className="text-center">
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{stage.label}</div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div
                  className={`${stage.color} h-2 rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
