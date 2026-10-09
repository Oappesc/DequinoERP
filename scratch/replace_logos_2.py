import re

def replace_dq_logo(filepath, replacement, match_text="DQ"):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Find <div> tags containing only "DQ" (with possible whitespace)
        # We look for <div className="...">\s*DQ\s*</div>
        pattern = r'<div className="[^"]*font-black[^"]*">\s*DQ\s*</div>'
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
        else:
            print(f"Pattern not found in {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")

replace_dq_logo('components/admin/Sidebar.tsx', r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-10 w-auto object-contain drop-shadow-sm shrink-0" />')
replace_dq_logo('app/admin/layout.tsx', r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-8 w-auto object-contain drop-shadow-sm shrink-0" />')
replace_dq_logo('app/login/admin/page.tsx', r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" />')
replace_dq_logo('app/login/vendedor/page.tsx', r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" />')
