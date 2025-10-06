import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

@Module({
  controllers: [SignalsController],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
