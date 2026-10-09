import re

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix for POLITICA DE CREDITO text classes
# It was: <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"> {esAtrasado(selected) && <TriangleAlert className="w-3.5 h-3.5" />} • POLÍTICA DE CRÉDITO </p>
# We need to change it to: <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"> ...
content = re.sub(
    r'<p className="text-\[11px\] font-bold uppercase tracking-wider flex items-center gap-1\.5">',
    r'<p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">',
    content
)

# Replace the Comision text
# It was: <span className="text-sm text-slate-500">Comisión Asesor ({selected.porcentaje_comision ?? 10}%)</span>
# Or something similar.
content = re.sub(
    r'<span className="text-sm text-slate-500">Comisi(?:ó|Ã³|\xef\xbf\xbd)n Asesor[^<]*</span>',
    r'<span className="text-sm text-slate-500">Comisión Asesor (10%)</span>',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
