import re

with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

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

if "const handleLogout" not in content:
    content = content.replace("export default function Sidebar() {", "export default function Sidebar() {" + logout_fn)

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
