# =============================================================================
# Multi-stage build para Next.js
# =============================================================================

# Estágio 1: Dependências
FROM node:18-alpine AS deps

# Instalar dependências de sistema
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# Instalar dependências
RUN npm ci

# =============================================================================
# Estágio 2: Build
# =============================================================================

FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .
COPY ../shared ../shared

# Gerar build otimizado
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# =============================================================================
# Estágio 3: Produção
# =============================================================================

FROM node:18-alpine AS runner

WORKDIR /app

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public

# Definir permissões corretas para pasta .next
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar build da aplicação
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV PORT 3000
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de início
CMD ["node", "server.js"]