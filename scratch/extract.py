import re

filepath = 'lib/actions.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the function start and end using simple logic
start_idx = content.find('export async function crearYNotificarPedido')
if start_idx != -1:
    end_idx = content.find('\n}\n', start_idx) + 3
    if end_idx < 3: # In case there's no \n}\n, look for 'return { data: { orderId: order.id } };\n}'
        end_idx = content.find('return { data: { orderId: order.id } };\n}') + len('return { data: { orderId: order.id } };\n}')
    
    crear_logic = content[start_idx:end_idx]
    
    admin_logic = crear_logic.replace('export async function crearYNotificarPedido(data: FormData | any)', 'export async function adminCrearPedido(data: FormData | any)')
    admin_logic = re.sub(
        r'const sellerId = await currentSellerId\(\);\s*if \(\!sellerId\) return \{ error: [^\}]+\};',
        "const supabaseAdmin = await requireAdmin();\n    const sellerId = String(getVal('vendedorId') ?? '');\n    if (!sellerId) return { error: 'Debes seleccionar un vendedor.' };",
        admin_logic
    )
    
    content += '\n\n' + admin_logic + '\n'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Fail")
