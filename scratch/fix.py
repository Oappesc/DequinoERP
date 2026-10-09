import re
with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('</div>\n                    <div className="border border-slate-200 rounded-xl overflow-hidden">', '</div>\n                      )}\n                    <div className="border border-slate-200 rounded-xl overflow-hidden">')

with open('app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
