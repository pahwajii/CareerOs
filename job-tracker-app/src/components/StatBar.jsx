import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import Card from "./ui/Card"
import Button from "./ui/Button"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

export default function StatBar({ jobs = [] }) {
  const [showCharts, setShowCharts] = useState(false)
  const [timelinePeriod, setTimelinePeriod] = useState("day") // "day" or "week"
  const { theme, isDark } = useTheme()

  // 1. Basic counts
  const total = jobs.length
  const saved = jobs.filter(j => j.status === "saved").length
  const applied = jobs.filter(j => j.status === "applied").length
  const screening = jobs.filter(j => j.status === "screening").length
  const interviewed = jobs.filter(j => j.status === "interview" || j.status === "offer").length
  const offer = jobs.filter(j => j.status === "offer").length
  const rejected = jobs.filter(j => j.status === "rejected").length

  // 2. Conversion metrics: Interview success rate (Interviews -> Offers)
  const interviewSuccessRate = interviewed > 0 
    ? Math.round((offer / interviewed) * 100) 
    : 0

  // 3. Theme-aware colors
  const statusColors = isDark ? {
    Saved: "#64748b",      // slate-500
    Applied: "#3b82f6",    // blue-500
    Screening: "#c084fc",  // purple-400
    Interview: "#fbbf24",  // amber-400
    Offer: "#34d399",      // emerald-400
    Rejected: "#f87171"     // red-400
  } : {
    Saved: "#94a3b8",      // slate-400
    Applied: "#2563eb",    // blue-600
    Screening: "#a855f7",  // purple-500
    Interview: "#d97706",  // amber-600
    Offer: "#059669",      // emerald-600
    Rejected: "#dc2626"     // red-600
  }

  const chartTheme = {
    grid: isDark ? "#1e293b" : "#f1f5f9",         // slate-800 vs slate-100
    text: isDark ? "#94a3b8" : "#64748b",         // slate-400 vs slate-500
    tooltipBg: isDark ? "#0f172a" : "#ffffff",    // slate-900 vs white
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",// slate-700 vs slate-200
    tooltipText: isDark ? "#cbd5e1" : "#1e293b"   // slate-300 vs slate-900
  }

  const pieData = [
    { name: "Saved", value: saved, color: statusColors.Saved },
    { name: "Applied", value: applied, color: statusColors.Applied },
    { name: "Screening", value: screening, color: statusColors.Screening },
    { name: "Interview", value: interviewed - offer, color: statusColors.Interview },
    { name: "Offer", value: offer, color: statusColors.Offer },
    { name: "Rejected", value: rejected, color: statusColors.Rejected }
  ].filter(item => item.value > 0)

  // 4. Timeline data (grouped by Day or Week)
  const getWeekStart = (dateStr) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return "Unknown"
      const day = date.getDay()
      const diff = date.getDate() - day
      const sunday = new Date(date.setDate(diff))
      return sunday.toISOString().split("T")[0]
    } catch {
      return "Unknown"
    }
  }

  const timelineMap = {}
  jobs.forEach(job => {
    if (job.appliedDate) {
      const dateStr = new Date(job.appliedDate).toISOString().split("T")[0]
      const periodKey = timelinePeriod === "day" ? dateStr : getWeekStart(dateStr)
      timelineMap[periodKey] = (timelineMap[periodKey] || 0) + 1
    }
  })

  const timelineData = Object.keys(timelineMap)
    .sort()
    .map(date => ({
      date,
      count: timelineMap[date]
    }))

  return (
    <div className="space-y-6 mb-8 max-w-5xl mx-auto w-full transition-colors duration-300">
      {/* Counts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <StatCard label="Total Apps" count={total} color="bg-indigo-50/50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30" />
        <StatCard label="Saved" count={saved} color="bg-gray-50 text-gray-500 dark:bg-slate-900 dark:text-slate-400 border border-gray-150 dark:border-slate-800" />
        <StatCard label="Applied" count={applied} color="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30" />
        <StatCard label="Screening" count={screening} color="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30" />
        <StatCard label="Interviews" count={interviewed} color="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30" />
        <StatCard label="Offers" count={offer} color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30" />
      </div>

      {/* Analytics Toggle */}
      <div className="flex justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCharts(!showCharts)}
        >
          {showCharts ? "📊 Hide Visual Analytics" : "📊 View Visual Analytics"}
        </Button>
      </div>

      {/* Expanded Charts Panel */}
      {showCharts && (
        <div className="grid md:grid-cols-3 gap-6 items-stretch animate-fadeIn">
          {/* Donut Chart: Status distribution */}
          <Card className="p-5 flex flex-col items-center justify-between min-h-[300px]">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-center w-full">Status Breakdown</h4>
            {pieData.length > 0 ? (
              <div className="w-full h-48 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: chartTheme.tooltipBg, 
                        borderColor: chartTheme.tooltipBorder,
                        borderRadius: "12px" 
                      }} 
                      itemStyle={{ color: chartTheme.tooltipText }}
                      formatter={(value) => [`${value} applications`, "Count"]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic my-auto">No status records to display.</p>
            )}
            
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Area Chart: Applications timeline */}
          <Card className="p-5 flex flex-col justify-between min-h-[300px] md:col-span-2">
            <div className="flex justify-between items-center w-full border-b border-gray-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Application Volume</h4>
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border dark:border-slate-700">
                <button
                  onClick={() => setTimelinePeriod("day")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition ${timelinePeriod === "day" ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-slate-400"}`}
                >
                  Day
                </button>
                <button
                  onClick={() => setTimelinePeriod("week")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition ${timelinePeriod === "week" ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-slate-400"}`}
                >
                  Week
                </button>
              </div>
            </div>

            {timelineData.length > 0 ? (
              <div className="w-full h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartTheme.text }} stroke={chartTheme.grid} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: chartTheme.text }} stroke={chartTheme.grid} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: chartTheme.tooltipBg, 
                        borderColor: chartTheme.tooltipBorder,
                        borderRadius: "12px"
                      }}
                      itemStyle={{ color: chartTheme.tooltipText }}
                    />
                    <Area type="monotone" dataKey="count" name="Applications" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic my-auto text-center">No dates recorded yet.</p>
            )}

            {/* Stat Card: Interview conversion rate */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center px-2">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Interview Conversion Rate</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">Percentage of interviews converting to offers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-850 dark:text-slate-100 block">{interviewSuccessRate}%</span>
                </div>
                <div className="w-14 bg-gray-150 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(interviewSuccessRate, 100)}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, count, color }) {
  return (
    <div className={`p-4 rounded-xl border text-center shadow-xs transition duration-200 hover:-translate-y-[1px] ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="text-2xl font-black mt-1">{count}</p>
    </div>
  )
}
