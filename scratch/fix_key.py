import re
import os

filepath = 'components/reportes/VentasTab.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the key
content = content.replace("key={c.rif + i}", "key={c.id ?? c.rif ?? `top-client-${i}`}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
