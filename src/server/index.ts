import { app } from './app.js';
import { env } from './config.js';
import { prisma } from './lib/prisma.js';

process.on('unhandledRejection', (reason) => console.error('[server] unhandledRejection:', reason));
process.on('uncaughtException', (error) => console.error('[server] uncaughtException:', error));

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Server listening on ${env.HOST}:${env.PORT} (NODE_ENV=${env.NODE_ENV})`);
});
server.on('error', (error) => {
  console.error('[server] Falha ao iniciar o servidor HTTP:', error);
  process.exit(1);
});

const shutdown = async () => {
  console.log('[server] Encerrando...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
