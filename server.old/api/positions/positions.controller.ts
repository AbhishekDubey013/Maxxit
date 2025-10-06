import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { QueryPositionsDto } from './dto';

@ApiTags('positions')
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get positions with PnL calculations (read-only, paginated)' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async findAll(@Query() query: QueryPositionsDto) {
    return this.positionsService.findAll(query);
  }
}
