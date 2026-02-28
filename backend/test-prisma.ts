import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
export { MosaicRoom } from './src/MosaicRoom';

export default {
  async fetch(request: any, env: any) {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });
    const users = await prisma.user.findMany();
    return new Response(JSON.stringify(users));
  }
}
