import re
import os

filepath = 'app/admin/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const statusClasses: Record<OrderStatus, string> = \{.*?\};\n', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
