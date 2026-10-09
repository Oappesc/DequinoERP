import re

with open('components/admin/Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace mobile logo (w-8 h-8)
c = re.sub(
    r'<div className="w-8 h-8[^"]*?bg-gradient-to-br[^"]*?">\s*DQ\s*</div>',
    r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-8 w-auto object-contain drop-shadow-sm shrink-0" />',
    c
)

# Replace desktop logo (w-10 h-10)
c = re.sub(
    r'<div className="w-10 h-10[^"]*?bg-gradient-to-br[^"]*?">\s*DQ\s*</div>',
    r'<img src="/logo-dequino.png" alt="Dequino Logo" className="h-10 w-auto object-contain drop-shadow-sm shrink-0" />',
    c
)

with open('components/admin/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated Sidebar.tsx")
