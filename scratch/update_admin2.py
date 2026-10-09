import re
import sys

filepath = 'app/admin/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes_made = 0

# 1. Add Modal Import
if "import CrearPedidoModal" not in content:
    content = content.replace("import Sidebar from '@/components/admin/Sidebar';", "import Sidebar from '@/components/admin/Sidebar';\nimport CrearPedidoModal from '@/components/admin/CrearPedidoModal';")
    changes_made += 1

# 2. Add state
if "const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);" not in content:
    content = content.replace("const [selectedPedido, setSelectedPedido] = useState<AdminOrder | null>(null);", "const [selectedPedido, setSelectedPedido] = useState<AdminOrder | null>(null);\n  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);")
    changes_made += 1

# 3. Add button in the header
# It currently has:
# <header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col justify-center mb-6">
# Let's change header to flex-row justify-between items-center
header_html = r'<header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col justify-center \nmb-6">'
# Let's just find <header className="bg-dequino-secondary...
header_match = re.search(r'<header className="bg-dequino-secondary[^>]+>', content)
if header_match:
    new_header = header_match.group(0).replace('flex-col justify-center', 'flex flex-col md:flex-row justify-between items-start md:items-center')
    content = content[:header_match.start()] + new_header + content[header_match.end():]
    
    # inject button right before <CurrencySwitcher
    currency_switch_idx = content.find('<CurrencySwitcher')
    if currency_switch_idx != -1:
        button_code = '''
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <button onClick={() => setIsCrearModalOpen(true)} className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm text-xs transition-all">
                + Crear Pedido
              </button>
            </div>
'''
        content = content[:currency_switch_idx] + button_code + content[currency_switch_idx:]
        changes_made += 1

# 4. Read only logic
is_ro_code = '''
  const isReadOnly = ['entregado', 'en_revision', 'pagado'].includes(selectedPedido?.estado || '');
  const [downloading, setDownloading] = useState(false);
'''
if "const isReadOnly =" not in content:
    content = content.replace("const [downloading, setDownloading] = useState(false);", is_ro_code)
    changes_made += 1

# 5. Read only badge
badge_html = '''
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(selectedPedido.created_at).toLocaleString('es-VE')} • Vendedor: <span className="font-semibold">{selectedPedido.vendedor?.nombre ?? 'Desconocido'}</span>
                    </p>
                    {isReadOnly && (
                      <div className="bg-slate-100 text-slate-600 font-bold text-[11px] px-3 py-1 rounded-full w-fit mt-2 border border-slate-200">
                        Pedido en solo lectura (estado: {selectedPedido.estado.replace(/_/g, ' ')})
                      </div>
                    )}
'''
content = re.sub(r'<p className="text-sm text-slate-500 mt-1">.*?</span>\s*</p>', badge_html, content, flags=re.DOTALL)
changes_made += 1

# 6. Hide Product Search
search_html = '''
                      {!isReadOnly && (
                        <div className="relative mb-4">
'''
if "{!isReadOnly && (" not in content:
    content = content.replace('<div className="relative mb-4">', search_html, 1)

    content = content.replace('''
                          {searchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                              {searchResults.map(p => (
                                <button key={p.id} type="button" onClick={() => handleAddProduct(p)} className="flex w-full justify-between rounded-lg px-3 py-2 hover:bg-slate-50 text-left text-sm">
                                  <span><strong>{formatProductName(p)}</strong> ({p.codigo})</span>
                                  <span className="font-semibold text-sky-700">{formatCurrency(p.precio)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
''', '''
                          {searchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                              {searchResults.map(p => (
                                <button key={p.id} type="button" onClick={() => handleAddProduct(p)} className="flex w-full justify-between rounded-lg px-3 py-2 hover:bg-slate-50 text-left text-sm">
                                  <span><strong>{formatProductName(p)}</strong> ({p.codigo})</span>
                                  <span className="font-semibold text-sky-700">{formatCurrency(p.precio)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
''')
    changes_made += 1

# 7. Make inputs read-only
input_html = '''<input 
                                    type="number" 
                                    min="1" 
                                    value={item.cantidad} 
                                    disabled={isReadOnly}
                                    className={`w-20 border rounded px-2 py-1 text-center ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}'''
content = re.sub(r'<input\s+type="number"\s+min="1"\s+value=\{item\.cantidad\}\s+onChange=\{e =>', input_html + ' \n                                    onChange={e =>', content)

# 8. Hide delete button
del_html = '''
                                  {!isReadOnly && (
                                    <button onClick={() => handleDeleteProduct(index)} className="text-rose-500 hover:text-rose-700 font-semibold text-xs">
                                      Eliminar
                                    </button>
                                  )}
'''
content = re.sub(r'<button onClick=\{.*?handleDeleteProduct.*?Eliminar\s*</button>', del_html, content, flags=re.DOTALL)

# 9. Select commission read-only
com_html = '''<input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={commissionPct} 
                              disabled={isReadOnly}
                              className={`w-16 border rounded-lg px-2 py-1.5 text-center text-sm ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}'''
content = re.sub(r'<input\s+type="number"\s+min="0"\s+max="100"\s+value=\{commissionPct\}\s+onChange=\{e =>', com_html + ' \n                              onChange={e =>', content)

# 10. Hide guardaar cambios
save_btn_html = '''
                      {!isReadOnly && (
                        <button 
                          onClick={() => void handleSaveOrder()} 
                          disabled={savingOrder || itemsEdit.length === 0}
                          className="px-5 py-2.5 rounded-2xl bg-dequino-primary text-white font-medium hover:bg-[#6C8264] shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50 text-sm"
                        >
                          {savingOrder ? 'Guardando...' : (selectedPedido.cliente?.razon_social?.includes('PENDIENTE RIF') ? 'Registrar Cliente y Guardar Cambios' : 'Guardar Cambios')}
                        </button>
                      )}
'''
content = re.sub(r'<button \s*onClick=\{.*?handleSaveOrder.*?\s*disabled=.*?\s*className="px-5 py-2\.5 rounded-2xl bg-dequino-primary.*?</button>', save_btn_html, content, flags=re.DOTALL)

# 11. Add Modal
modal_html = '''
      {isCrearModalOpen && (
        <CrearPedidoModal 
          isOpen={isCrearModalOpen} 
          onClose={() => setIsCrearModalOpen(false)} 
          sellers={sellers}
          onCreated={() => {
            setIsCrearModalOpen(false);
            loadData(true);
          }}
        />
      )}
'''
if "isCrearModalOpen && (" not in content:
    content = content.replace("</main>", modal_html + "\n</main>")
    changes_made += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated app/admin/page.tsx. Changes made count: {changes_made}")
