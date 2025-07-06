# =============================================================================
# Multi-stage build para otimizar tamanho da imagem
# =============================================================================

# Estágio 1: Build
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências de sistema necessárias
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .
COPY ../shared ../shared

# Build da aplicação
RUN npm run build

# =============================================================================
# Estágio 2: Produção
# =============================================================================

FROM node:18-alpine AS production

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nxtapp -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Instalar apenas dependências de runtime necessárias
RUN apk add --no-cache dumb-init curl

# Copiar dependências do estágio de build
COPY --from=builder --chown=nxtapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nxtapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nxtapp:nodejs /app/package*.json ./

# Criar diretórios necessários
RUN mkdir -p logs uploads temp && chown -R nxtapp:nodejs logs uploads temp

# Mudar para usuário não-root
USER nxtapp

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Usar dumb-init para lidar com sinais corretamente
ENTRYPOINT ["dumb-init", "--"]

# Comando de início
CMD ["node", "dist/index.js"]