with open('components/reportes/ConsignacionTab.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_s = """<select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all cursor-pointer"
        >"""
new_s = """<div className="relative inline-block">
        <select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
          className="appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
        >"""
c = c.replace(old_s, new_s)

old_s_end = """</select>
      </div>"""
new_s_end = """</select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>"""
c = c.replace(old_s_end, new_s_end)

c = c.replace("<option value=\"\">", "<option className=\"bg-white text-slate-700 py-1.5\" value=\"\">")
c = c.replace("<option key={c.id}", "<option className=\"bg-white text-slate-700 py-1.5\" key={c.id}")

with open('components/reportes/ConsignacionTab.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
