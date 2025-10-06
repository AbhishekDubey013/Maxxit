import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
