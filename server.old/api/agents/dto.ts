import { IsString, IsEnum, IsArray, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VenueEnum {
  SPOT = 'SPOT',
  GMX = 'GMX',
  HYPERLIQUID = 'HYPERLIQUID',
}

export enum AgentStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

export class CreateAgentDto {
  @ApiProperty({ example: 'Alpha Trader' })
  @IsString()
  name: string;

  @ApiProperty({ enum: VenueEnum, example: VenueEnum.GMX })
  @IsEnum(VenueEnum)
  venue: VenueEnum;

  @ApiProperty({
    type: [Number],
    example: [10, 20, 15, 25, 10, 5, 10, 5],
    description: 'Array of 8 weights, each 0-100',
  })
  @IsArray()
  @ArrayMinSize(8)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  weights: number[];
}

export class UpdateAgentDto {
  @ApiPropertyOptional({ enum: AgentStatusEnum })
  @IsOptional()
  @IsEnum(AgentStatusEnum)
  status?: AgentStatusEnum;

  @ApiPropertyOptional({
    type: [Number],
    example: [10, 20, 15, 25, 10, 5, 10, 5],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(8)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  weights?: number[];
}

export class QueryAgentsDto {
  @ApiPropertyOptional({ enum: VenueEnum })
  @IsOptional()
  @IsEnum(VenueEnum)
  venue?: VenueEnum;

  @ApiPropertyOptional({ enum: AgentStatusEnum })
  @IsOptional()
  @IsEnum(AgentStatusEnum)
  status?: AgentStatusEnum;

  @ApiPropertyOptional({ example: 'apr30d' })
  @IsOptional()
  @IsString()
  sort?: string;

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
