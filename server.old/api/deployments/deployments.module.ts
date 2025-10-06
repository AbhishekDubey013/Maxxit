import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { RelayerService } from '../../adapters/relayer.service';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';

@Module({
  controllers: [DeploymentsController],
  providers: [DeploymentsService, RelayerService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
