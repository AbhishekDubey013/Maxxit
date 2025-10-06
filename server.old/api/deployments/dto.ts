import { IsString, IsUUID, IsEnum, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DeploymentStatusEnum {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export class CreateDeploymentDto {
  @ApiProperty({ example: 'uuid-of-agent' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
  @IsString()
  safeWallet: string;
}

export class UpdateDeploymentDto {
  @ApiProperty({ enum: DeploymentStatusEnum })
  @IsEnum(DeploymentStatusEnum)
  status: DeploymentStatusEnum;
}

export class QueryDeploymentsDto {
  @ApiPropertyOptional({ example: 'uuid-of-agent' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by current user' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  me?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
