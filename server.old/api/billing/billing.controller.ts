import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { QueryBillingDto } from './dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Get billing events (read-only, paginated)' })
  @ApiResponse({ status: 200, description: 'Billing events retrieved successfully' })
  async findAll(@Query() query: QueryBillingDto) {
    return this.billingService.findAll(query);
  }
}
