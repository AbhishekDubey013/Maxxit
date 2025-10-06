import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './api/auth/auth.module';
import { AgentsModule } from './api/agents/agents.module';
import { DeploymentsModule } from './api/deployments/deployments.module';
import { SignalsModule } from './api/signals/signals.module';
import { PositionsModule } from './api/positions/positions.module';
import { BillingModule } from './api/billing/billing.module';
import { AdminModule } from './api/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    AuthModule,
    AgentsModule,
    DeploymentsModule,
    SignalsModule,
    PositionsModule,
    BillingModule,
    AdminModule,
  ],
})
export class AppModule {}
