import re
import os

filepath = 'components/vendedor/ListaPedidos.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Mojibake (just in case they weren't fully fixed)
content = content.replace("Â€¢ POLÃTICA DE CRÃ©DITO", "• POLÍTICA DE CRÉDITO")
content = re.sub(r'\{selected\.dias_credito\}\s*dA-as', '{selected.dias_credito} días', content)
content = re.sub(r'\{selected\.dias_credito\}\s*d[ÃA]-?as', '{selected.dias_credito} días', content)
content = re.sub(r'ComisiÃ³n Asesor', 'Comisión Asesor', content)
content = re.sub(r'ComisiA3n Asesor', 'Comisión Asesor', content)
content = re.sub(r'Comisin Asesor', 'Comisión Asesor', content)

# 2. Update Document Links Section
old_links_section_regex = r"\{\/\* Links de Documentos \*\/\}.*?(?=\{\/\* Totales y Comisiones \*\/\}|</div>\s*<div className=\"flex flex-col gap-2 mt-2\")"

new_links_section = """{/* Links de Documentos */}
                {(selected.observacion?.includes('http') || selected.comprobante_url || ['en_revision', 'pagado'].includes(selected.estado)) && (
                  <div className="flex flex-col gap-2 mt-1">
                    {selected.observacion?.includes('http') && (
                      <button 
                        type="button"
                        onClick={() => window.open(selected.observacion!.match(/https?:\\/\\/[^\\s]+/)?.[0], '_blank')}
                        className="w-full py-2.5 px-4 bg-[#FAF8F5] border border-dequino-tertiary/60 hover:bg-[#F3EFEA] text-dequino-secondary font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <Upload className="w-4 h-4 text-dequino-primary" />
                        Ver foto del RIF subida
                      </button>
                    )}
                    
                    {(selected.comprobante_url || ['en_revision', 'pagado'].includes(selected.estado)) && selected.comprobante_url && (
                      <button 
                        type="button"
                        onClick={() => window.open(selected.comprobante_url!, '_blank')}
                        className="w-full py-2.5 px-4 bg-[#FAF8F5] border border-dequino-tertiary/60 hover:bg-[#F3EFEA] text-dequino-secondary font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-dequino-primary" />
                        Ver comprobante de pago
                      </button>
                    )}
                  </div>
                )}

                """

# Ensure python doesn't throw on re.sub with unmatched groups
content = content.replace(re.search(old_links_section_regex, content, flags=re.DOTALL).group(0), new_links_section) if re.search(old_links_section_regex, content, flags=re.DOTALL) else content

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
