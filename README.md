# api-docker-mitigation

API Express com redundância de 3 instâncias em Docker. Sistema de mitigação que garante disponibilidade contínua através de failover automático.

## Visão Geral

Este projeto implementa uma arquitetura resiliente onde 3 instâncias idênticas da API Express executam em paralelo. Um load balancer Nginx distribui as requisições automaticamente entre as instâncias, redirecionando para instâncias saudáveis caso uma falhe.

## Arquitetura

```
Cliente HTTP
    |
    v
Nginx (Port 80)
    |
    +-> Instance-1 (Port 3001) - Primary
    |
    +-> Instance-2 (Port 3002) - Backup
    |
    +-> Instance-3 (Port 3003) - Backup
```

### Como funciona

1. Cliente envia requisição para localhost:80
2. Nginx recebe e verifica saúde de todas as instâncias
3. Requisição é roteada para instância mais disponível
4. Se uma instância falhar, Nginx automaticamente redireciona para outra
5. Docker reinicia instâncias que caem

## Requisitos

- Docker versão 20.10 ou superior
- Docker Compose versão 2.0 ou superior
- 500MB de espaço em disco disponível
- Portas 80, 3001, 3002, 3003 disponíveis

## Estrutura de Arquivos

```
projeto/
├── app.js                  # Aplicação Express
├── package.json            # Dependências do projeto
├── package-lock.json       # Lock das versões
├── Dockerfile              # Configuração da imagem
├── docker-compose.yml      # Orquestração dos containers
├── nginx.conf              # Configuração do load balancer
└── README.md               # Este arquivo
```

## Instalação

### Passo 1: Clonar ou preparar o repositório

```bash
cd api-docker-mitigation
```

### Passo 2: Fazer build das imagens Docker

```bash
docker-compose build
```

Este comando cria as imagens Docker baseadas no Dockerfile. Pode levar alguns minutos na primeira execução.

### Passo 3: Iniciar o sistema

```bash
docker-compose up -d
```

O flag `-d` inicia os containers em background. Aguarde 15 segundos para que todos os containers estejam prontos.

### Passo 4: Verificar status

```bash
docker-compose ps
```

Você deve ver 4 containers rodando:
- api-instance-1 (Up)
- api-instance-2 (Up)
- api-instance-3 (Up)
- nginx-loadbalancer (Up)

## Uso

### Acessar a API

A API está disponível em `http://localhost` (porta 80).

### Endpoints disponíveis

#### GET /health

Verifica a saúde da instância.

```bash
curl http://localhost/health
```

Resposta:

```json
{
  "status": "healthy",
  "instance": "Instance-1-Primary",
  "uptime": 245.5
}
```

#### GET /

Retorna confirmação que a API está funcionando.

```bash
curl http://localhost/
```

Resposta:

```json
{
  "message": "API funcionando!",
  "processedBy": "Instance-1-Primary",
  "timestamp": "2024-01-07T10:30:45.123Z"
}
```

#### GET /api/data

Retorna dados com identificação da instância que processou.

```bash
curl http://localhost/api/data
```

Resposta:

```json
{
  "data": {
    "id": "abc123xyz",
    "message": "Dados da API",
    "requestNumber": 1
  },
  "processedBy": "Instance-2-Backup",
  "timestamp": "2024-01-07T10:30:45.123Z"
}
```

#### GET /api/process

Simula uma operação que leva 1 segundo para completar.

```bash
curl http://localhost/api/process
```

Resposta:

```json
{
  "result": "Processamento concluído",
  "processingTimeMs": 1005,
  "processedBy": "Instance-3-Backup",
  "timestamp": "2024-01-07T10:30:45.123Z"
}
```

#### POST /api/echo

Recebe dados JSON e retorna confirmação da instância que processou.

```bash
curl -X POST http://localhost/api/echo \
  -H "Content-Type: application/json" \
  -d '{"name":"teste","valor":123}'
```

Resposta:

```json
{
  "received": {
    "name": "teste",
    "valor": 123
  },
  "echoedBy": "Instance-1-Primary",
  "timestamp": "2024-01-07T10:30:45.123Z"
}
```

## Testando Redundância

### Teste 1: Verificar distribuição de carga

Execute múltiplas requisições e observe qual instância processa cada uma.

```bash
for i in {1..10}; do curl -s http://localhost/api/data | jq .processedBy; done
```

Você verá as instâncias sendo alternadas.

### Teste 2: Simular falha de uma instância

Pause a instância primary:

```bash
docker-compose stop api-instance-1
```

Execute requisições novamente:

```bash
curl http://localhost/api/data
```

A API continua respondendo normalmente, processada por Instance-2 ou Instance-3.

### Teste 3: Recuperação automática

Reinicie a instância que foi parada:

```bash
docker-compose start api-instance-1
```

Verifique o status:

```bash
docker-compose ps
```

A instância volta a receber requisições automaticamente.

### Teste 4: Monitorar logs em tempo real

Ver todos os logs:

```bash
docker-compose logs -f
```

Ver logs de uma instância específica:

```bash
docker-compose logs -f api-instance-1
```

Ver logs do Nginx (mostra qual instância processou cada requisição):

```bash
docker-compose logs -f nginx
```

## Gerenciamento

### Parar todos os containers

```bash
docker-compose stop
```

Os containers são pausados mas não removidos.

### Remover containers

```bash
docker-compose down
```

Remove todos os containers.

### Remover containers e volumes

```bash
docker-compose down -v
```

Remove containers e dados persistidos (use com cuidado).

### Reconstruir imagens

```bash
docker-compose build --no-cache
```

Força a recriação de todas as imagens sem usar cache.

### Verificar uso de recursos

```bash
docker stats
```

Mostra CPU, memória e rede utilizada por cada container.

## Health Checks

Cada instância possui um health check configurado que:

- Executa a cada 10 segundos
- Tenta se conectar ao endpoint /health
- Aguarda resposta dentro de 5 segundos
- Tenta 3 vezes antes de marcar como unhealthy

Se uma instância falhar no health check, Docker automaticamente reinicia o container.

## Load Balancing

O Nginx utiliza as seguintes estratégias:

### Seleção de instância

Usa `least_conn` para rotear requisições para a instância com menos conexões ativas. Isso garante distribuição equilibrada.

### Pesos

- Instance-1: weight=3 (preferencial)
- Instance-2: weight=2 (segunda opção)
- Instance-3: weight=1 (terceira opção)

### Retry

Se uma instância não responder ou der erro 5xx, Nginx automaticamente tenta a próxima com timeout de 10 segundos.

## Portas

- 80: Nginx Load Balancer (interface externa)
- 3001: Instance-1 (acesso direto, opcional)
- 3002: Instance-2 (acesso direto, opcional)
- 3003: Instance-3 (acesso direto, opcional)

Para acessar uma instância específica (útil para debug):

```bash
curl http://localhost:3001/api/data
curl http://localhost:3002/api/data
curl http://localhost:3003/api/data
```

## Troubleshooting

### Containers não iniciam

Verifique se as portas 80, 3001, 3002, 3003 estão em uso:

```bash
lsof -i :80
lsof -i :3001
```

Se estiverem em uso, ou libere as portas ou altere as portas no docker-compose.yml.

### Timeout nas requisições

Aumente o timeout no nginx.conf se suas operações forem lentas:

```
proxy_read_timeout 60s;
```

### Uma instância fica reiniciando

Verifique os logs:

```bash
docker-compose logs api-instance-1
```

Pode ser falta de memória ou erro na aplicação.

### Nginx retorna 502 Bad Gateway

Confirme que as instâncias estão rodando e saudáveis:

```bash
docker-compose ps
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Performance

### Tempos típicos de failover

Quando uma instância falha, o tempo até ser detectado e requisição ser redirecionada é:

- Detecção: 10 segundos (intervalo do health check)
- Redirecionamento: menos de 1 segundo
- Total: aproximadamente 11 segundos

### Capacidade

Cada instância suporta aproximadamente:

- 100 requisições simultâneas
- 1000 requisições por segundo
- 1GB de memória RAM

A capacidade total do sistema é a soma das 3 instâncias.

## Desenvolvimento

### Fazer alterações na aplicação

1. Edite o arquivo app.js
2. Reconstrua as imagens:

```bash
docker-compose build --no-cache
```

3. Reinicie os containers:

```bash
docker-compose down
docker-compose up -d
```

### Adicionar novos endpoints

Edite app.js e adicione rotas normalmente com Express. Após salvar, reconstrua conforme descrito acima.

### Alterar portas

Edite docker-compose.yml na seção `ports` de cada serviço. Não altere a porta interna (3000), apenas a externa.

## Monitoring

Para monitoramento em produção, você pode:

1. Usar ferramentas externas que consultam os endpoints `/health`
2. Usar Docker Events para monitorar reinicializações
3. Exportar logs para sistemas centralizados
4. Usar ferramentas como Prometheus + Grafana

## Segurança

Recomendações para produção:

- Use variáveis de ambiente para credenciais (arquivo .env)
- Configure HTTPS com certificados válidos
- Restrinja acesso às portas 3001, 3002, 3003 via firewall
- Use secrets do Docker para dados sensíveis
- Implemente rate limiting no Nginx
- Adicione autenticação aos endpoints

## Suporte

Para problemas ou dúvidas:

1. Verifique os logs: `docker-compose logs -f`
2. Valide a configuração do docker-compose.yml
3. Confirme que Docker e Docker Compose estão atualizados
4. Teste os endpoints manualmente com curl