import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RebuildMetricsDto {
  @ApiPropertyOptional({ example: 'uuid-of-agent', description: 'Agent ID to rebuild metrics for (optional - rebuilds all if not provided)' })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
