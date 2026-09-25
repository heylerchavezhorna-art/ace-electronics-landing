# -*- coding: utf-8 -*-
"""Compone las páginas del sitio a partir de las plantillas de src/.

    python build.py

Lee cada archivo de src/paginas/*.html (con una cabecera de datos en comentario),
lo inserta en src/plantilla.html junto con las partes comunes (menú, pie, avisos)
y escribe el HTML final en la raíz del proyecto, que es lo que se publica.
"""
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(RAIZ, 'src')
VERSION = '33'          # se añade a css/js para renovar la caché del navegador
DOMINIO = 'https://aceelectronicsperu.com/'


def leer(ruta):
    with io.open(ruta, encoding='utf-8') as f:
        return f.read()


def escribir(ruta, texto):
    os.makedirs(os.path.dirname(ruta) or '.', exist_ok=True)
    with io.open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)


def datos_y_cuerpo(texto):
    """Separa la cabecera <!-- clave: valor --> del contenido de la página."""
    m = re.match(r'\s*<!--\s*(.*?)\s*-->\s*', texto, re.S)
    if not m:
        raise SystemExit('Falta la cabecera de datos en la página')
    datos = {}
    for linea in m.group(1).split('\n'):
        if ':' in linea:
            k, v = linea.split(':', 1)
            datos[k.strip()] = v.strip()
    return datos, texto[m.end():]


def construir():
    plantilla = leer(os.path.join(SRC, 'plantilla.html'))
    partes = {}
    for nombre in os.listdir(os.path.join(SRC, 'partes')):
        partes[nombre[:-5]] = leer(os.path.join(SRC, 'partes', nombre))

    paginas = sorted(os.listdir(os.path.join(SRC, 'paginas')))
    hechas = []
    for archivo in paginas:
        if not archivo.endswith('.html'):
            continue
        datos, cuerpo = datos_y_cuerpo(leer(os.path.join(SRC, 'paginas', archivo)))
        ruta = datos.get('ruta', archivo)
        seccion = datos.get('seccion', '')

        salida = plantilla
        for nombre, contenido in partes.items():
            salida = salida.replace('{{' + nombre + '}}', contenido)

        extra = datos.get('scripts', '')
        scripts = ''.join(
            '\n<script src="js/%s?v=%s"></script>' % (s.strip(), VERSION)
            for s in extra.split(',') if s.strip()
        )
        reemplazos = {
            'titulo': datos.get('titulo', 'ACE Electronics'),
            'descripcion': datos.get('descripcion', ''),
            'canonical': DOMINIO + ('' if ruta == 'index.html' else ruta),
            'contenido': cuerpo.strip(),
            'scripts': scripts,
            'version': VERSION,
            'clase': datos.get('clase', ''),
            'extra_head': datos.get('extra_head', ''),
            'robots': '\n  <meta name="robots" content="noindex">' if datos.get('noindex') else '',
        }
        for clave, valor in reemplazos.items():
            salida = salida.replace('{{' + clave + '}}', valor)

        # marca la sección activa del menú
        salida = salida.replace('data-seccion="%s"' % seccion,
                                'data-seccion="%s" aria-current="page"' % seccion, 1) if seccion else salida

        sobrantes = re.findall(r'\{\{(\w+)\}\}', salida)
        if sobrantes:
            raise SystemExit('Marcador sin reemplazar en %s: %s' % (archivo, set(sobrantes)))

        escribir(os.path.join(RAIZ, ruta), salida)
        hechas.append((ruta, len(salida) // 1024))

    print('Páginas generadas:')
    for ruta, kb in hechas:
        print('  %-38s %3d KB' % (ruta, kb))
    return hechas


if __name__ == '__main__':
    construir()
    sys.exit(0)
