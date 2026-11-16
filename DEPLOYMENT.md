# Deployment: Ubuntu, ISPConfig and Nginx

**Planned only.** The candidate domain is `allpanina.astrodev.pe`; DNS, certificates and the server have not been changed by this task. BugLab must remain isolated and untouched. No Vercel deployment is planned.

## Prepare the artifact

On a build machine with Node.js 24, use the committed lockfile:

```sh
cd frontend
npm ci
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Publish only the contents of `frontend/dist/`. Do not copy the repository, `.git`, environment files, research ZIPs, `node_modules` or virtualenvs. Keep the previous accepted artifact outside the public web root for rollback. Data and cartography are required parts of dist; preserve them and their hashes together with the HTML/assets.

## Create an isolated ISPConfig site (future operator steps)

1. Confirm the exact domain, server IP and DNS ownership. Create or select an AllpaNina-only website/vhost in ISPConfig, with its own system user, web directory and logs. Do not reuse BugLab's vhost, directory, certificate or global Nginx snippets.
2. Record the **actual** document root shown by this ISPConfig installation. Paths such as `/var/www/clients/clientN/webM/web` are examples, not values to copy blindly. Transfer the build contents into that site's web root with the ownership managed by ISPConfig; never use world-writable permissions.
3. Configure HTTPS through the panel's supported certificate/ACME settings after DNS and challenge validation are ready. Then enable HTTP-to-HTTPS redirect for this site. No application backend, PHP runtime, Node service or proxy to Vite is needed.
4. Review the generated site's configuration before adding directives. ISPConfig may already create `location /`, static-extension rules and headers: merge the intended behaviour using that version's supported per-site options/snippets. **Do not paste a duplicate location, edit generated files as a permanent solution, or modify the global template for all sites.** An administrator must check the effective configuration and test it before reload.

## Intended Nginx location behaviour

The following is an example for review **inside this site's server context**, with its root, TLS, MIME include and logs already managed by ISPConfig. It is not an entire vhost or a script to run. Reconcile existing location/header rules first. The `^~` prefixes keep scientific assets out of generic regex handlers and SPA fallback.

```nginx
location ^~ /data/ {
    types { application/json json; application/geo+json geojson; text/csv csv; }
    try_files $uri =404;
    expires -1;
}
location ^~ /cartography/ {
    types { application/json json; application/geo+json geojson; }
    try_files $uri =404;
    expires -1;
}
location ^~ /assets/ {
    # Inherit the server's standard mime.types, including JS, CSS and fonts.
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
location = /index.html {
    expires -1;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

Missing resources must return 404 without the application HTML. Do not configure a server-wide `error_page 404 /index.html` that defeats these locations. JS/Worker responses need a JavaScript MIME type, not text/html. The assets cache rule applies only to Vite's hashed artifact names; HTML and unhashed data must revalidate. When adding headers, review Nginx inheritance so site security headers are retained in these locations.

At this site's server scope, enable gzip if it is not already inherited:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types application/json application/geo+json text/csv
           application/javascript text/javascript text/css image/svg+xml;
```

Use Brotli only if the installed Nginx includes a supported module and its administrator has reviewed the site's configuration; gzip alone is sufficient. Do not add unknown module directives or upgrade the shared server as part of deploying AllpaNina. Optional precompression must still negotiate the correct content and Vary headers.

## MapLibre, Workers and external data

Serve over HTTPS with WebGL enabled in the browser. The build includes the MapLibre Worker; inspect the generated worker URL and its response MIME. Do not impose an untested Content-Security-Policy: if a policy is used, allow the actual same-origin/worker URLs, any needed blob workers, and the imagery endpoints used by the map. A policy must be tested against both the map and My region rather than broadly disabling browser protections.

No environment variable is mandatory for published exploration. Optional `VITE_FIRMS_BASE` changes the FIRMS base **during build**. It must never contain the user's MAP_KEY. Test FIRMS from the final browser origin with a user-supplied key: network success in curl does not establish CORS permission. Manual CSV upload remains available. If a proxy is actually required, design a separate, constrained upstream route at that point; do not create an open proxy or change BugLab to provide it.

## Verify after an authorised publication

Before reloading a future configuration, the server administrator should validate the **effective** site setup (`nginx -t`, with appropriate privileges) and retain a rollback copy. No such command was executed against the server in this task.

Example checks after the domain is live:

```sh
curl -I https://allpanina.astrodev.pe/calendar
curl -I https://allpanina.astrodev.pe/map
curl -I https://allpanina.astrodev.pe/data/peru/manifest.json
curl -I https://allpanina.astrodev.pe/data/does-not-exist.json
curl -I https://allpanina.astrodev.pe/cartography/does-not-exist.geojson
curl -I https://allpanina.astrodev.pe/assets/does-not-exist.js
curl -I -H 'Accept-Encoding: gzip' https://allpanina.astrodev.pe/data/peru/cells_PE_2020.geojson
```

Expect page HTML, existing-file content types, genuine missing-file 404s and negotiated compression for a large GeoJSON. Also download a CSV and GeoJSON and compare their decoded bytes with the committed products/manifests; curl `--compressed` can inspect decoded content. Do not infer correctness solely from HEAD responses. Verify deep-link reloads, cache behaviour after a new build, maps, keyboard/mobile interactions, browser console, Workers, FIRMS and basemap fallback. Confirm BugLab still works independently. Only after these checks select the production commit for the future `hackathon-2026-final` tag.

Sources: [Nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files), [gzip](https://nginx.org/en/docs/http/ngx_http_gzip_module.html), [cache/header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html), [ISPConfig documentation](https://www.ispconfig.org/documentation/). Per-site paths and available panel settings must be checked on the installed version.

## Reproducibility

See [REPRODUCIBILITY.md](REPRODUCIBILITY.md) before modifying scientific inputs or validating a build. Publish only frontend/dist; research fixtures and local reports are not web assets.
