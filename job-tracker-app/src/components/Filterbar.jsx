export default function FilterBar({ filter, setFilter }) {
  const statuses = ["all", "saved", "applied", "screening", "interview", "offer", "rejected", "withdrawn"]

  return (
    <div className="mt-6 flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
        🎯 Filter Applications
      </span>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border border-gray-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 capitalize cursor-pointer hover:border-gray-300 dark:hover:border-slate-700 transition"
      >
        {statuses.map(status => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  )
}
