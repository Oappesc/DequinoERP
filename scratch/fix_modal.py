import re
import os

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Mojibake
content = content.replace("â€¢ PolÃ­tica de CrÃ©dito", "• POLÍTICA DE CRÉDITO")
content = content.replace("dÃ­as", "días")
content = content.replace("Â€¢ POLÃTICA DE CRÃ©DITO", "• POLÍTICA DE CRÉDITO")

# Fix button rendering logic
content = content.replace("{(selected.comprobante_url || ['en_revision', 'pagado'].includes(selected.estado)) && selected.comprobante_url && (", "{(selected.comprobante_url || ['en_revision', 'pagado'].includes(selected.estado)) && (")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
