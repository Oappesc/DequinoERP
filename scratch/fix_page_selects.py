with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Select 1
old_s1 = """<select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as 'todos' | OrderStatus)}
                className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
              >"""
new_s1 = """<div className="relative inline-block">
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as 'todos' | OrderStatus)}
                className="appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
              >"""
c = c.replace(old_s1, new_s1)

old_s1_end = """</select>

              <select"""
new_s1_end = """</select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              <select"""
c = c.replace(old_s1_end, new_s1_end)

# Select 2
old_s2 = """<select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
              >"""
new_s2 = """<div className="relative inline-block">
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
              >"""
c = c.replace(old_s2, new_s2)

old_s2_end = """</select>
            </div>"""
new_s2_end = """</select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>"""
c = c.replace(old_s2_end, new_s2_end)

# Options
c = c.replace("<option value=\"todos\">", "<option className=\"bg-white text-slate-700 py-1.5\" value=\"todos\">")
c = c.replace("<option key={status}", "<option className=\"bg-white text-slate-700 py-1.5\" key={status}")
c = c.replace("<option key={m.value}", "<option className=\"bg-white text-slate-700 py-1.5\" key={m.value}")

with open('app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
