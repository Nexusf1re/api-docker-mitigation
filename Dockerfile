FROM node:18-alpine

WORKDIR /app

# Copia package.json e instala dependências
COPY package.json .
RUN npm install --production

# Copia o código da aplicação
COPY app.js .

# Expõe a porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "app.js"]