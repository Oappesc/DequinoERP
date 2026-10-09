with open('components/admin/CrearPedidoModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("useState<'factura' | 'nota'>('factura')", "useState<'factura' | 'nota_entrega'>('factura')")
c = c.replace("setDocType('nota')", "setDocType('nota_entrega')")
c = c.replace("docType === 'nota'", "docType === 'nota_entrega'")

with open('components/admin/CrearPedidoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
