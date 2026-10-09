import re

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')

# The prompt exactly says:
# Reemplaza Â€¢ POLÃTICA DE CRÃ©DITO por: • POLÍTICA DE CRÉDITO
# Reemplaza {dias} dÃas por: {dias} días
# Reemplaza ComisiÃ³n Asesor por: Comisión Asesor (10%)
# Wait, this means in UTF-8, it's literally written with those bytes interpreting as mojibake.
content = content.replace("Â€¢ POLÃTICA DE CRÃ©DITO", "• POLÍTICA DE CRÉDITO")
content = content.replace("dÃas", "días")
content = content.replace("ComisiÃ³n Asesor", "Comisión Asesor")
# Just to be sure, use regular expressions that match the exact letters that might be mojibake.
content = re.sub(r'[Â€¢?]+\s*POL[ÃA]-?TICA DE CR[Ã©A]+DITO', '• POLÍTICA DE CRÉDITO', content, flags=re.IGNORECASE)
content = re.sub(r'd[ÃA]-?as', 'días', content)
content = re.sub(r'Comisi[Ã³A]n Asesor', 'Comisión Asesor', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
