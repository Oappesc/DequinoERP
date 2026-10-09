import os

def fix_mojibake(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            c = f.read()
            
        new_c = c.replace('ConsignaciA3n', 'Consignación')
        new_c = new_c.replace('SesiA3n', 'Sesión')
        new_c = new_c.replace('facturaciA3n', 'facturación')
        new_c = new_c.replace('informaciA3n', 'información')
        new_c = new_c.replace('PestaAas', 'Pestañas')
        
        if new_c != c:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_c)
            print(f"Fixed mojibake in {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")

for root, _, files in os.walk('components'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_mojibake(os.path.join(root, file))

for root, _, files in os.walk('app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_mojibake(os.path.join(root, file))
