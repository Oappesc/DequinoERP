with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { useRouter } from 'next/navigation';" not in content:
    content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useRouter } from 'next/navigation';\nimport { createBrowserClient } from '@supabase/ssr';")

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
