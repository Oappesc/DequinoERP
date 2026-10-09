with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the mess at the top
lines = c.split('\n')
if "import { useRouter" not in c:
    lines.insert(1, "import { useRouter } from 'next/navigation';")
    lines.insert(2, "import { createBrowserClient } from '@supabase/ssr';")
else:
    # Let's just fix line 1 if it's messed up
    if lines[0] != "'use client';":
        # remove the mangled line 0 and replace
        lines[0] = "'use client';"
        
        # also make sure imports exist
        if "import { useRouter" not in '\n'.join(lines):
            lines.insert(1, "import { useRouter } from 'next/navigation';")
            lines.insert(2, "import { createBrowserClient } from '@supabase/ssr';")

c = '\n'.join(lines)
with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
