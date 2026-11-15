# Compresión HTTP del Mapa nacional

Estado: **pendiente de configurar y verificar en el servidor personal**. No se dispone de acceso a ese servidor en esta sesión. La compilación Vite no configura Nginx y las pruebas locales de gzip no demuestran compresión HTTP en producción.

El contrato exige comprimir JSON/GeoJSON. Los 14 archivos originales se conservan sin modificar; el mayor cumple 8 MB sin comprimir y cada archivo queda por debajo de 1 MB al comprimirlo localmente con gzip (prueba automatizada).

## Ejemplo Nginx

Adaptar al `server` existente, con `root` apuntando a `frontend/dist`. No sustituir configuraciones ajenas sin revisarlas.

```nginx
location ^~ /data/ {
    try_files $uri =404;
    types {
        application/json json;
        application/geo+json geojson;
        text/csv csv;
    }
    gzip on;
    gzip_types application/json application/geo+json text/csv;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_vary on;
}

# Mismos tipos y compresión para el recurso territorial derivado.
location ^~ /cartography/ {
    try_files $uri =404;
    types { application/geo+json geojson; }
    gzip on;
    gzip_types application/geo+json;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_vary on;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Los bloques `/data/` y `/cartography/` no deben devolver `index.html` si falta un archivo. La negociación de compresión debe conservar las atribuciones, contenido y datos originales. Tras configurar, validar con `nginx -t` y recargar según el procedimiento del servidor. Un proxy intermedio también debe revisarse.

## Comprobar con GET real, sin navegador

Reemplazar DOMINIO por el sitio real. En Linux:

```sh
curl --compressed -H 'Accept-Encoding: gzip' -D - -o /dev/null https://DOMINIO/data/peru/cells_PE_2024.geojson
curl --compressed -H 'Accept-Encoding: gzip' -D - -o /dev/null https://DOMINIO/data/peru/method.json
curl --compressed -H 'Accept-Encoding: gzip' -D - -o /dev/null https://DOMINIO/cartography/departamentos_inei_2023.navigation.geojson
curl -D - -o /dev/null https://DOMINIO/cartography/no-existe.geojson
curl -D - -o /dev/null https://DOMINIO/data/peru/no-existe.geojson
```

En PowerShell usar `curl.exe` y `-o NUL` en lugar de `/dev/null`.

Verificar `200`, `Content-Encoding: gzip`, `Vary: Accept-Encoding` y el tipo MIME correcto. Para el archivo ausente debe obtenerse `404`, nunca una respuesta SPA `200`. No basta con ver que existe `gzip` en un archivo de configuración: registrar los encabezados de respuestas reales. Repetir detrás del dominio/proxy público y, si aplica, tras invalidar cachés.

Para integridad de extremo a extremo, descargar con `--compressed` a un archivo temporal y comparar su SHA-256 con el manifiesto; `--compressed` guarda el contenido descomprimido. No confundir el tamaño comprimido en red con el tamaño del contenido recuperado.
