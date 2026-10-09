import re
import os

with open('app/vendedor/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace export default function SellerPage() { ... }
# with export default function CrearPedidoModal({ isOpen, onClose, sellers }: { isOpen: boolean; onClose: () => void; sellers: any[] }) { ... }
# Also add seller select state
# Also add absolute imports and close button
content = content.replace("export default function SellerPage() {", """
export default function CrearPedidoModal({ isOpen, onClose, sellers, onCreated }: { isOpen: boolean; onClose: () => void; sellers: any[], onCreated: () => void }) {
  const [selectedSeller, setSelectedSeller] = useState('');
""")

content = content.replace("const result = await crearYNotificarPedido({", """
    const result = await adminCrearPedido({
      vendedorId: selectedSeller,
""")

content = content.replace("import { getSellerData, crearYNotificarPedido }", "import { getSellerData, adminCrearPedido }")

# In the return statement, wrap everything in a modal
return_idx = content.find('return (')
if return_idx != -1:
    before_return = content[:return_idx]
    after_return = content[return_idx:]
    
    after_return = after_return.replace('return (', '''return !isOpen ? null : (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
  <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl my-auto border border-dequino-tertiary/40 relative" onClick={(e) => e.stopPropagation()}>
    <button onClick={onClose} className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
      ✕
    </button>
    <div className="mb-6">
      <h2 className="text-2xl font-black text-dequino-secondary">Crear Nuevo Pedido</h2>
      <p className="text-sm text-slate-500">Completa los pasos para crear un pedido a nombre de un vendedor.</p>
    </div>
    
    <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <label className="block text-sm font-bold text-dequino-secondary mb-2">Asignar a Asesor / Vendedor *</label>
      <select value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-dequino-primary text-sm">
        <option value="">-- Seleccionar Asesor --</option>
        {sellers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </div>
''')
    # find the very last closing tag for the main container and close the modal divs
    # we'll just replace the final '</main>\n    </div>\n  );\n}' with '</main>\n  </div>\n</div>\n  );\n}'
    
    after_return = after_return.replace('</main>\n    </div>', '</main>\n  </div>\n</div>')
    
    content = before_return + after_return

# Remove the Header component and tabs since it's a modal now
content = re.sub(r'<Header.*?/>', '', content, flags=re.DOTALL)
content = re.sub(r'<div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-100 flex gap-1 overflow-x-auto">.*?</div>', '', content, flags=re.DOTALL)
content = re.sub(r'\{tab === \'nuevo\' \? \(', '', content)
content = re.sub(r'\) : \(\s*<ListaPedidos.*?/>\s*\)\}', '', content, flags=re.DOTALL)

# Add adminCrearPedido to imports
content = content.replace("crearYNotificarPedido", "adminCrearPedido")

# Replace onSuccess handling
content = content.replace("setTab('pedidos');", "onCreated(); onClose();")

with open('components/admin/CrearPedidoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Created CrearPedidoModal.tsx")
