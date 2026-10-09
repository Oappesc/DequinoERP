with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

import re
# Match any combination of title={isCollapsed ? \'...
c = re.sub(r"title=\{isCollapsed \? \\'Cerrar SesiA3n\\' : undefined\}", "title={isCollapsed ? 'Cerrar Sesión' : undefined}", c)

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
