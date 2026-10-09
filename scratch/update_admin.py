import re
import os

filepath = 'app/admin/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Modal Import
if "import CrearPedidoModal" not in content:
    content = content.replace("import Sidebar from '@/components/admin/Sidebar';", "import Sidebar from '@/components/admin/Sidebar';\nimport CrearPedidoModal from '@/components/admin/CrearPedidoModal';")

# Add state
if "const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);" not in content:
    content = content.replace("const [selectedPedido, setSelectedPedido] = useState<AdminOrder | null>(null);", "const [selectedPedido, setSelectedPedido] = useState<AdminOrder | null>(null);\n  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);")

# Add button
button_html = '''
        <button onClick={() => setIsCrearModalOpen(true)} className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm text-xs transition-all">
          + Crear Pedido
        </button>
      </div>
'''
content = re.sub(r'</div>\s*<div className="grid gap-6 md:grid-cols-3 mb-8">', button_html + '\n      <div className="grid gap-6 md:grid-cols-3 mb-8">', content)

# Add isReadOnly logic
is_ro_code = '''
  const isReadOnly = ['entregado', 'en_revision', 'pagado'].includes(selectedPedido?.estado || '');
  const [downloading, setDownloading] = useState(false);
'''
content = content.replace("const [downloading, setDownloading] = useState(false);", is_ro_code)

# Add read only badge
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

# Hide Product Search
search_html = '''
                      {!isReadOnly && (
                        <div className="relative mb-4">
'''
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

# Make inputs read-only
input_html = '''<input 
                                    type="number" 
                                    min="1" 
                                    value={item.cantidad} 
                                    disabled={isReadOnly}
                                    className={`w-20 border rounded px-2 py-1 text-center ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}'''
content = re.sub(r'<input\s+type="number"\s+min="1"\s+value=\{item\.cantidad\}\s+onChange=\{e =>', input_html + ' \n                                    onChange={e =>', content)

# Hide delete button
del_html = '''
                                  {!isReadOnly && (
                                    <button onClick={() => handleDeleteProduct(index)} className="text-rose-500 hover:text-rose-700 font-semibold text-xs">
                                      Eliminar
                                    </button>
                                  )}
'''
content = re.sub(r'<button onClick=\{.*?handleDeleteProduct.*?Eliminar\s*</button>', del_html, content, flags=re.DOTALL)

# Select commission read-only
com_html = '''<input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={commissionPct} 
                              disabled={isReadOnly}
                              className={`w-16 border rounded-lg px-2 py-1.5 text-center text-sm ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}'''
content = re.sub(r'<input\s+type="number"\s+min="0"\s+max="100"\s+value=\{commissionPct\}\s+onChange=\{e =>', com_html + ' \n                              onChange={e =>', content)

# Hide guardaar cambios
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

# Add Modal
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
content = content.replace("</main>", modal_html + "\n</main>")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app/admin/page.tsx")
