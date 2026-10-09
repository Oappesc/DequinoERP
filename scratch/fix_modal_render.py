import re

filepath = 'app/admin/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Import
if "CrearPedidoModal" not in content:
    content = content.replace("import { CurrencySwitcher } from '@/components/CurrencySwitcher';", "import { CurrencySwitcher } from '@/components/CurrencySwitcher';\nimport CrearPedidoModal from '@/components/admin/CrearPedidoModal';")

# 2. Add Modal Render
modal_html = '''
      {isCrearModalOpen && (
        <CrearPedidoModal 
          isOpen={isCrearModalOpen} 
          onClose={() => setIsCrearModalOpen(false)} 
          sellers={[]} 
          onCreated={() => {
            setIsCrearModalOpen(false);
            window.location.reload();
          }}
        />
      )}
'''
if "isCrearModalOpen && (" not in content:
    # let's just find the final </div>
    last_div_idx = content.rfind('</div>')
    if last_div_idx != -1:
        content = content[:last_div_idx] + modal_html + content[last_div_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app/admin/page.tsx successfully!")
