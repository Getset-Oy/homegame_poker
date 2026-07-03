# Testiajokontti: node (vitest-runtime) + bun (paketinhallinta).
# Riippuvuudet asennetaan ajon yhteydessä nimettyyn node_modules-volumeen,
# joten image pysyy geneerisenä eikä sitä tarvitse buildata uudelleen deps-muutoksissa.
FROM node:22-slim
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
