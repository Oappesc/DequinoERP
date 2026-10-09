import re

def stylize_selects(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        def replace_select(match):
            full_select = match.group(0)
            
            has_w_full = 'w-full' in full_select
            wrapper_class = "relative inline-block w-full" if has_w_full else "relative inline-block"
            
            value_match = re.search(r'value=\{[^}]+\}', full_select)
            onchange_match = re.search(r'onChange=\{[^}]+\}', full_select)
            
            value_str = value_match.group(0) if value_match else ''
            onchange_str = onchange_match.group(0) if onchange_match else ''
            
            inner_options_match = re.search(r'<select[^>]*>(.*?)</select>', full_select, re.DOTALL)
            inner_options = inner_options_match.group(1) if inner_options_match else ''
            
            inner_options = re.sub(r'<option(?! className)', r'<option className="bg-white text-slate-700 py-1.5"', inner_options)
            
            new_select_class = "appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
            if has_w_full:
                new_select_class = "w-full " + new_select_class
                
            chevron = '<svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>'
            
            return f'''<div className="{wrapper_class}">
                <select {value_str} {onchange_str} className="{new_select_class}">
                  {inner_options}
                </select>
                {chevron}
              </div>'''

        new_content = re.sub(r'<select[^>]*>.*?</select>', replace_select, content, flags=re.DOTALL)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated selects in {filepath}")
        else:
            print(f"No changes for {filepath}")
        
    except Exception as e:
        print(f"Error {filepath}: {e}")

stylize_selects('components/reportes/ConsignacionTab.tsx')
stylize_selects('components/reportes/VentasTab.tsx')
