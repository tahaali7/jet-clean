#!/usr/bin/env python3
# Add iPhone/iOS optimizations to the HTML file

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add viewport-fit=cover for notch iPhones
old_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
new_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">'
content = content.replace(old_viewport, new_viewport)

# 2. Add iOS-specific CSS styles
old_style_end = '    </style>'
new_styles = '''        /* iOS / iPhone optimizations */
        * { -webkit-touch-callout: none; -webkit-user-select: none; }
        input, select, textarea { -webkit-user-select: auto; }
        body {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        select, input[type="date"], input[type="number"], input[type="text"], input[type="password"] {
            font-size: 16px !important; /* Prevent iOS auto-zoom on focus */
        }
        button { touch-action: manipulation; }
        /* Prevent iOS bounce overscroll */
        html { overflow: hidden; height: 100%; }
        body { overflow-y: auto; -webkit-overflow-scrolling: touch; }
        /* Smooth scrolling */
        body { scroll-behavior: smooth; }
    </style>'''
content = content.replace(old_style_end, new_styles)

# 3. Fix body padding to work with safe areas (keep md:p-8 but adjust base)
old_body_class = 'class="bg-slate-900 text-slate-100 min-h-screen p-4 md:p-8"'
new_body_class = 'class="bg-slate-900 text-slate-100 min-h-screen p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8 md:pt-[calc(2rem+env(safe-area-inset-top))] md:pb-[calc(2rem+env(safe-area-inset-bottom))]"'
content = content.replace(old_body_class, new_body_class)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("iOS optimizations added!")
print("- viewport-fit=cover for notch iPhones")
print("- Safe area padding for notch")
print("- 16px font on inputs (prevent auto-zoom)")
print("- touch-action: manipulation (no double-tap zoom)")
print("- -webkit-tap-highlight-color: transparent")
print("- Prevent iOS bounce overscroll")
