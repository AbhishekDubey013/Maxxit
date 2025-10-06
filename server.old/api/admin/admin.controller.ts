import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RebuildMetricsDto } from './dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('refresh-venues')
  @ApiOperation({ summary: 'Refresh venue status and token registry data' })
  @ApiResponse({ status: 200, description: 'Venues refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshVenues() {
    return this.adminService.refreshVenues();
  }

  @Post('rebuild-metrics')
  @ApiOperation({ summary: 'Rebuild agent metrics (APR, Sharpe) from PnL snapshots' })
  @ApiResponse({ status: 200, description: 'Metrics rebuilt successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rebuildMetrics(@Query() query: RebuildMetricsDto) {
    return this.adminService.rebuildMetrics(query.agentId);
  }
}
