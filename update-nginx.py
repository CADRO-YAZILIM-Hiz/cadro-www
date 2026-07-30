c = open('/etc/nginx/sites-enabled/cadro').read()
c = c.replace(
    '        try_files $uri $uri.html $uri/ =404;',
    '        include /etc/nginx/snippets/cadro-rewrites.conf;\n        try_files $uri $uri.html $uri/ =404;'
)
open('/etc/nginx/sites-enabled/cadro', 'w').write(c)
print('Config updated successfully')