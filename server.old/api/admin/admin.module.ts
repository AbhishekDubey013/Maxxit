import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { GmxAdapter } from '../../adapters/gmx.adapter';
import { HyperliquidAdapter } from '../../adapters/hyperliquid.adapter';
import { SpotAdapter } from '../../adapters/spot.adapter';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, GmxAdapter, HyperliquidAdapter, SpotAdapter],
  exports: [AdminService],
})
export class AdminModule {}
