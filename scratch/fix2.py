import re
with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. State
c = c.replace('const [selectedPedido, setSelectedPedido] = useState<any | null>(null);', 'const [selectedPedido, setSelectedPedido] = useState<any | null>(null);\n  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);')

# 2. Fix the quantity input class
c = re.sub(
    r'className=\{`w-20 border rounded px-2 py-1 text-center \$\{isReadOnly \? \'bg-slate-50 text-slate-600 border-none\' : \'\'\}`\}\s+onChange=\{e => \{\s+const val = Math\.max\(1, Number\(e\.target\.value\) \|\| 1\);\s+const newItems = \[\.\.\.itemsEdit\];\s+newItems\[index\]\.cantidad = val;\s+setItemsEdit\(newItems\);\s+\}\}\s+className="w-16 border rounded px-2 py-1 text-center outline-none focus:border-sky-500"',
    r'''className={`w-16 border rounded px-2 py-1 text-center outline-none focus:border-sky-500 ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}
                                    onChange={e => {
                                      const val = Math.max(1, Number(e.target.value) || 1);
                                      const newItems = [...itemsEdit];
                                      newItems[index].cantidad = val;
                                      setItemsEdit(newItems);
                                    }}''',
    c
)

# 3. Fix the commission input class
c = re.sub(
    r'className=\{`w-16 border rounded-lg px-2 py-1\.5 text-center text-sm \$\{isReadOnly \? \'bg-slate-50 text-slate-600 border-none\' : \'\'\}`\}\s+onChange=\{e => setCommissionPct\(Math\.max\(0, Number\(e\.target\.value\) \|\| 0\)\)\}\s+className="w-20 border rounded-lg px-3 py-2 text-right outline-none focus:border-sky-500 font-semibold"',
    r'''className={`w-20 border rounded-lg px-3 py-2 text-right outline-none focus:border-sky-500 font-semibold ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}
                              onChange={e => setCommissionPct(Math.max(0, Number(e.target.value) || 0))}''',
    c
)

with open('app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
