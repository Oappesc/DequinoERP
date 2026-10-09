with open('components/admin/CrearPedidoModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_select = """<select 
                    value={selectedSeller} 
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                  >"""
new_select = """<div className="relative inline-block w-full">
                  <select 
                    value={selectedSeller} 
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
                  >"""

c = c.replace(old_select, new_select)
c = c.replace("<option value=\"\">", "<option className=\"bg-white text-slate-700 py-1.5\" value=\"\">")
c = c.replace("<option key={v.id}", "<option className=\"bg-white text-slate-700 py-1.5\" key={v.id}")

c = c.replace("""</select>
                </div>

                {/* Cliente */}""", """</select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Cliente */}""")

with open('components/admin/CrearPedidoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
