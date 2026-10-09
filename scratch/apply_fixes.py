import re

def process_lista_pedidos():
    filepath = 'components/vendedor/ListaPedidos.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix Mojibake
    content = re.sub(r'\? PolA-tica de CrAcdito', '• POLÍTICA DE CRÉDITO', content)
    content = re.sub(r'PolA-tica de CrAcdito', 'POLÍTICA DE CRÉDITO', content)
    content = re.sub(r'dA-as', 'días', content)
    content = re.sub(r'ComisiA3n', 'Comisión', content)
    # The prompt says: Reemplaza `ComisiÃ³n Asesor` por: `Comisión Asesor (10%)`.
    # It already had "ComisiA3n Asesor ({selected.porcentaje_comision ?? 10}%)" from my cat output.
    # So replacing ComisiA3n with Comisión is enough.

    # 2. Fix the capsule in the card
    old_capsule = """                {/* Bloque de Cobranza Vencida */}
                {['entregado', 'en_revision'].includes(order.estado) && order.fecha_limite_cobro && isVencido && (
                  <div className="bg-red-50/80 border border-red-200/60 rounded-lg px-2 py-0.5 text-[10px] text-red-600 font-medium flex items-center gap-1 w-fit mt-0.5">
                    <TriangleAlert className="w-3 h-3" />
                    Cobranza Vencida   Lmite {new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')} ({order.dias_credito} das)
                  </div>
                )}"""
    
    # Wait, the character encoding from my powershell cat command had 'Lmite' and 'das'.
    # I should use regex to replace the block safely.
    pattern = r"\{\/\* Bloque de Cobranza Vencida \*\/\}\s*\{\['entregado', 'en_revision'\]\.includes\(order\.estado\) && order\.fecha_limite_cobro && isVencido && \(\s*<div.*?<\/div>\s*\)\}"
    
    new_capsule = """{/* Bloque de Cobranza Vencida o Crédito Vigente */}
                {['entregado', 'en_revision'].includes(order.estado) && order.fecha_limite_cobro && (
                  isVencido ? (
                    <div className="bg-red-50/80 border border-red-200/60 rounded-lg px-2 py-0.5 text-[10px] text-red-600 font-medium flex items-center gap-1 w-fit mt-0.5">
                      <TriangleAlert className="w-3 h-3" />
                      Cobranza Vencida • Límite {new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')} ({order.dias_credito} días)
                    </div>
                  ) : (
                    <div className="bg-[#FFF9F0] border border-[#FCE6C7] rounded-xl px-2.5 py-1 flex items-center justify-between text-[11px] text-[#8C5D19] font-medium mt-1 mb-1">
                      <span>📅 Límite: {new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')}</span>
                      <span className="font-bold text-[#754C11]">{order.dias_credito} días</span>
                    </div>
                  )
                )}"""
                
    content = re.sub(pattern, new_capsule, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def process_admin_page():
    filepath = 'app/admin/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change 15000 to 60000 for loadData interval
    content = re.sub(r'setInterval\(loadData, \d+\)', 'setInterval(loadData, 60000)', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_lista_pedidos()
process_admin_page()
