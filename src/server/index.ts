import { app } from './app.js';import { env } from './config.js';import { prisma } from './lib/prisma.js';
const server=app.listen(env.PORT,()=>console.log(`API disponível na porta ${env.PORT}`));const shutdown=async()=>{server.close();await prisma.$disconnect();process.exit(0)};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
