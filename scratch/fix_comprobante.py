import re
import os

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace comprobante_url with comprobante_pago_url across the file
content = re.sub(r'comprobante_url', 'comprobante_pago_url', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
