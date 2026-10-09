import re

with open('app/vendedor/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export default function SellerPage() {", """
export default function CrearPedidoModal({ isOpen, onClose, sellers, onCreated }: { isOpen: boolean; onClose: () => void; sellers: any[], onCreated: () => void }) {
  const [selectedSeller, setSelectedSeller] = useState('');
  if (!isOpen) return null;
""")

content = content.replace("const result = await crearYNotificarPedido({", """
    const result = await adminCrearPedido({
      vendedorId: selectedSeller,
""")

content = content.replace("import { getSellerData, crearYNotificarPedido }", "import { getSellerData, adminCrearPedido }")
content = content.replace("crearYNotificarPedido", "adminCrearPedido")
content = content.replace("setTab('pedidos');", "onCreated(); onClose();")

# Remove Header
content = re.sub(r'<Header.*?/>', '', content, flags=re.DOTALL)

# Add seller select inside the 'nuevo' tab, right before PASO 1
seller_select = '''
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
                  <label className="block text-sm font-bold text-dequino-secondary mb-2">Asignar a Asesor / Vendedor *</label>
                  <select value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-dequino-primary text-sm">
                    <option value="">-- Seleccionar Asesor --</option>
                    {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
'''
content = content.replace("{/* PASO 1: Elige tu cliente */}", seller_select + "\n                {/* PASO 1: Elige tu cliente */}")

# Replace main return ONLY
content = content.replace('  return (\n    <main', '''  return (
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
  <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl my-auto border border-dequino-tertiary/40 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
    <button onClick={onClose} className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
      ✕
    </button>
    <div className="mb-4">
      <h2 className="text-2xl font-black text-dequino-secondary">Crear Nuevo Pedido</h2>
    </div>
    <main''')

content = content.replace('</main>\n    </div>\n  );\n}', '</main>\n  </div>\n</div>\n  );\n}')

# Remove tab buttons
content = re.sub(r'<div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-100 flex gap-1 overflow-x-auto">.*?</div>', '', content, flags=re.DOTALL)

with open('components/admin/CrearPedidoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
