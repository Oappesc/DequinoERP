import re

filepath = 'components/reportes/VentasTab.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("key={v.name + i}", "key={v.id ?? v.name ?? `vendedor-${i}`}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
