import re

with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useRouter and createBrowserClient if missing
if "useRouter" not in content:
    content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useRouter } from 'next/navigation';\nimport { createBrowserClient } from '@supabase/ssr';")
else:
    if "createBrowserClient" not in content:
        content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport { createBrowserClient } from '@supabase/ssr';")

# 2. Add handleLogout function inside Sidebar component
if "const handleLogout" not in content:
    # Find the top of Sidebar component
    sidebar_top = re.search(r'export default function Sidebar\(\{ isOpen, isCollapsed, toggleMenu, toggleCollapse \}: \{.*?\}\) \{', content, re.DOTALL)
    if sidebar_top:
        insert_idx = sidebar_top.end()
        logout_fn = '''
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login/admin');
  };
'''
        content = content[:insert_idx] + logout_fn + content[insert_idx:]

# 3. Add onClick to button and fix mojibake
# <button title={isCollapsed ? 'Cerrar SesiA3n' : undefined}
# ...
# Cerrar SesiA3n
content = re.sub(r'<button\s*title=\{isCollapsed \? \'Cerrar Sesi[^\']*\' : undefined\}\s*className', r'<button onClick={handleLogout} title={isCollapsed ? \'Cerrar Sesión\' : undefined} className', content)
content = re.sub(r'Cerrar Sesi[A-Za-z0-9]+n', 'Cerrar Sesión', content)

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Sidebar.tsx!")

# Now let's fix page.tsx
with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add sellers state
if "const [sellers, setSellers] = useState<any[]>([]);" not in content:
    content = content.replace("const [products, setProducts] = useState<any[]>([]);", "const [products, setProducts] = useState<any[]>([]);\n  const [sellers, setSellers] = useState<any[]>([]);")

# 2. Update loadData to set sellers
if "setSellers(res.data.sellers" not in content:
    content = content.replace("setOrders(res.data.orders as AdminOrder[]);\n          setProducts(res.data.products || []);", "setOrders(res.data.orders as AdminOrder[]);\n          setProducts(res.data.products || []);\n          setSellers(res.data.sellers || []);")

# 3. Add modal JSX at the very bottom
modal_html = '''
      {isCrearModalOpen && (
        <CrearPedidoModal 
          isOpen={isCrearModalOpen} 
          onClose={() => setIsCrearModalOpen(false)} 
          sellers={sellers} 
          onCreated={() => {
            setIsCrearModalOpen(false);
            window.location.reload();
          }}
        />
      )}
'''
if "isCrearModalOpen &&" not in content:
    # replace the very last </div>
    last_div_idx = content.rfind('</div>')
    if last_div_idx != -1:
        content = content[:last_div_idx] + modal_html + content[last_div_idx:]

if "import CrearPedidoModal" not in content:
    content = content.replace("import { CurrencySwitcher } from '@/components/CurrencySwitcher';", "import { CurrencySwitcher } from '@/components/CurrencySwitcher';\nimport CrearPedidoModal from '@/components/admin/CrearPedidoModal';")

with open('app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx!")
