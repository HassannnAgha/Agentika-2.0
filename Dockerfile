# Bizzii, built from the repository root (Alternate Clouds builds from here by default).
# Same image as project/Dockerfile; only the paths point into project/.

# --- build the onboarding wizard (Next.js)
FROM node:22-slim AS ui
WORKDIR /ui
COPY project/onboarding-ui/package*.json ./
RUN npm ci --no-audit --no-fund
COPY project/onboarding-ui/ ./
RUN npm run build

# --- runtime: Node (wizard, public port) + Python (gate, lead gen) in one container
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY project/requirements.txt .
RUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt
COPY project/ .
COPY --from=ui /ui/.next /app/onboarding-ui/.next
COPY --from=ui /ui/node_modules /app/onboarding-ui/node_modules
ENV PORT=8000 GATE_URL=http://127.0.0.1:8001 NODE_ENV=production DATA_DIR=/tmp/bizzii-data
RUN chmod +x start.sh
EXPOSE 8000
CMD ["./start.sh"]
