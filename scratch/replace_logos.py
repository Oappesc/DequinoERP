import re

def replace_logo_in_file(filepath, pattern, replacement):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated logo in {filepath}")
        else:
            print(f"No changes made to {filepath} (pattern not found)")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

# 1. Sidebar.tsx
sidebar_pattern = r'<div className="bg-dequino-primary text-white font-black text-xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10">\s*DQ\s*</div>'
sidebar_replacement = r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-10 w-auto object-contain drop-shadow-sm shrink-0" />'
replace_logo_in_file('components/admin/Sidebar.tsx', sidebar_pattern, sidebar_replacement)

# 2. admin/layout.tsx (mobile top bar)
layout_pattern = r'<div className="bg-dequino-primary text-white font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center shadow-md">\s*DQ\s*</div>'
layout_replacement = r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-8 w-auto object-contain drop-shadow-sm shrink-0" />'
replace_logo_in_file('app/admin/layout.tsx', layout_pattern, layout_replacement)

# 3. admin login
admin_login_pattern = r'<div className="bg-dequino-secondary text-white font-black text-3xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mx-auto mb-2">\s*DQ\s*</div>'
admin_login_replacement = r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" />'
replace_logo_in_file('app/login/admin/page.tsx', admin_login_pattern, admin_login_replacement)

# 4. vendedor login
vendedor_login_pattern = r'<div className="bg-dequino-primary text-white font-black text-3xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mx-auto mb-2">\s*DQ\s*</div>'
vendedor_login_replacement = r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" />'
replace_logo_in_file('app/login/vendedor/page.tsx', vendedor_login_pattern, vendedor_login_replacement)

# 5. vendedor page (header)
vendedor_page_pattern = r'<div className="bg-white rounded-2xl w-14 h-12 flex items-center justify-center p-1\.5 shrink-0 text-dequino-secondary font-black text-xl shadow-inner">\s*DQ\s*</div>'
vendedor_page_replacement = r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-12 w-auto object-contain shrink-0 drop-shadow-sm" />'
replace_logo_in_file('app/vendedor/page.tsx', vendedor_page_pattern, vendedor_page_replacement)

