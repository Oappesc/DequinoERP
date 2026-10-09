with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Just replace the whole line since we know what it looks like
c = c.replace(r"title={isCollapsed ? \'Cerrar SesiA3n\' : undefined}", "title={isCollapsed ? 'Cerrar Sesión' : undefined}")
c = c.replace('Cerrar SesiA3n', 'Cerrar Sesión')

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
