import re
import os

files = [
    'app/admin/page.tsx',
    'lib/actions.ts',
    'lib/actions_clientes.ts',
    'lib/actions_reportes.ts',
    'components/vendedor/ListaPedidos.tsx',
    'components/reportes/ConsignacionTab.tsx'
]

replacements = [
    (r"por_procesar", "en_proceso"),
    (r"procesado", "en_proceso"),
    (r"pedido_entregado", "entregado"),
    (r"pago_en_revision", "en_revision"),
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Manual fixes for app/admin/page.tsx
    if filepath == 'app/admin/page.tsx':
        # tabs
        content = content.replace("['registrado', 'por_procesar', 'procesado']", "['registrado', 'en_proceso']")
        content = content.replace("['pedido_entregado', 'pago_en_revision']", "['entregado', 'en_revision']")
        content = content.replace("Extract<OrderStatus, 'por_procesar' | 'procesado' | 'pedido_entregado' | 'pagado'>", "Extract<OrderStatus, 'en_proceso' | 'entregado' | 'en_revision' | 'pagado'>")
        
        # fix buttons
        buttons_old = """{order.estado === 'registrado' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'por_procesar')} className="rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Por procesar
                            </button>
                          )}
                          {order.estado === 'por_procesar' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'procesado')} className="rounded-xl bg-dequino-secondary hover:bg-[#2F3C2C] px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Procesado
                            </button>
                          )}
                          {order.estado === 'procesado' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'pedido_entregado')} className="rounded-xl bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Pedido entregado
                            </button>
                          )}
                          {order.estado === 'pago_en_revision' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'pagado')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                              Pagado
                            </button>
                          )}"""
                          
        buttons_new = """{order.estado === 'registrado' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'en_proceso')} className="rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Iniciar proceso
                            </button>
                          )}
                          {order.estado === 'en_proceso' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'entregado')} className="rounded-xl bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Marcar Entregado
                            </button>
                          )}
                          {order.estado === 'en_revision' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'pagado')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                              Confirmar Pago
                            </button>
                          )}"""
        content = content.replace(buttons_old, buttons_new)

        # replace old badge styling with new PedidoBadge
        content = re.sub(r'<span className=\{`rounded-full px-2\.5 py-1 text-xs font-medium \$\{statusClasses\[order\.estado\] \?\? \'bg-slate-100 text-slate-800\'\}`\}>\s*\{order\.estado\.replace\(\/_\/g, \' \'\)\}\s*</span>', r'<PedidoBadge estado={order.estado} />', content)

        # Import PedidoBadge
        if "PedidoBadge" not in content:
             content = content.replace("import type { PedidoEstado } from '@/types/database';", "import type { PedidoEstado } from '@/types/database';\nimport { PedidoBadge } from '@/components/PedidoBadge';")

        # Select options
        options_old = """<option value="por_procesar">Por procesar</option>
                <option value="procesado">Procesado</option>
                <option value="pedido_entregado">Pedido entregado</option>
                <option value="pago_en_revision">Pago en revisiÃ³n</option>"""
        options_new = """<option value="en_proceso">En Proceso</option>
                <option value="entregado">Entregado</option>
                <option value="en_revision">En Revisión</option>"""
        content = content.replace(options_old, options_new)
        # Also clean up standard replacements for any leftover strings
        for old, new in replacements:
            content = content.replace(f"'{old}'", f"'{new}'")
            content = content.replace(f'"{old}"', f'"{new}"')

    elif filepath == 'components/vendedor/ListaPedidos.tsx':
        # Select options
        content = content.replace("{ value: 'por_procesar', label: 'Por procesar' },", "{ value: 'en_proceso', label: 'En Proceso' },")
        content = content.replace("{ value: 'procesado', label: 'Procesado' },", "")
        content = content.replace("{ value: 'pedido_entregado', label: 'Pedido entregado' },", "{ value: 'entregado', label: 'Entregado' },")
        content = content.replace("{ value: 'pago_en_revision', label: 'Pago en revisión' },", "{ value: 'en_revision', label: 'En Revisión' },")
        
        # Replace the custom badges in ListaPedidos
        # Find where it renders {statuses.find((item) => item.value === order.estado)?.label} and use PedidoBadge
        if "PedidoBadge" not in content:
             content = content.replace("import type { PedidoEstado } from '@/types/database';", "import type { PedidoEstado } from '@/types/database';\nimport { PedidoBadge } from '@/components/PedidoBadge';")
        
        # Just regular string replacements
        for old, new in replacements:
            content = content.replace(f"'{old}'", f"'{new}'")
            content = content.replace(f'"{old}"', f'"{new}"')

    else:
        for old, new in replacements:
            content = content.replace(f"'{old}'", f"'{new}'")
            content = content.replace(f'"{old}"', f'"{new}"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")
