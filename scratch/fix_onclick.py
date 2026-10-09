import re
import os

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onClick={() => window.open(selected.comprobante_url!, '_blank')}", "onClick={() => selected.comprobante_url ? window.open(selected.comprobante_url, '_blank') : alert('El comprobante no está disponible o no se cargó correctamente.')}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
