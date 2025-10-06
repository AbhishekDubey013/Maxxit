import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SignalsService } from './signals.service';
import { QuerySignalsDto } from './dto';

@ApiTags('signals')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get signals with filters (read-only, paginated)' })
  @ApiResponse({ status: 200, description: 'Signals retrieved successfully' })
  async findAll(@Query() query: QuerySignalsDto) {
    return this.signalsService.findAll(query);
  }
}
