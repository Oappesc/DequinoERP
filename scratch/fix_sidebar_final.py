with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

import re
# Match the title prop no matter what's inside
c = re.sub(r"title=\{isCollapsed \? [^:]+ : undefined\}", "title={isCollapsed ? 'Cerrar Sesión' : undefined}", c)
c = re.sub(r"Cerrar Sesin", "Cerrar Sesión", c)
c = re.sub(r"Cerrar SesiA3n", "Cerrar Sesión", c)

# Let's also fix the duplicate backslashes if any
c = c.replace(r"\'", "'")

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
