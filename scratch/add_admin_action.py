import re

filepath = 'lib/actions.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the sellerId check in crearYNotificarPedido if we want, OR just add adminCrearPedido at the end
# It's easier to append adminCrearPedido to the file.
# First let's extract the body of crearYNotificarPedido to reuse it, or just copy it.
match = re.search(r'export async function crearYNotificarPedido.*?return { data: { orderId: order\.id } };\n  }', content, re.DOTALL)
if match:
    crear_logic = match.group(0)
    # create adminCrearPedido
    admin_logic = crear_logic.replace('export async function crearYNotificarPedido(data: FormData | any)', 'export async function adminCrearPedido(data: FormData | any)')
    
    # Replace seller check
    # From:
    # const sellerId = await currentSellerId();
    # if (!sellerId) return { error: 'Debes iniciar sesiA3n como vendedor.' };
    # To:
    # const supabaseAdmin = await requireAdmin();
    # const sellerId = String(getVal('vendedorId') ?? '');
    # if (!sellerId) return { error: 'Debes seleccionar un vendedor.' };
    
    admin_logic = re.sub(
        r'const sellerId = await currentSellerId\(\);\s*if \(\!sellerId\) return \{ error: [^\}]+\};',
        "const supabaseAdmin = await requireAdmin();\n    const sellerId = String(getVal('vendedorId') ?? '');\n    if (!sellerId) return { error: 'Debes seleccionar un vendedor.' };",
        admin_logic
    )
    
    # Append to the end of the file
    content += '\n\n' + admin_logic + '\n'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added adminCrearPedido")
else:
    print("Could not find crearYNotificarPedido")
