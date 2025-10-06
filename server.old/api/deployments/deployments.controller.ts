import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto, UpdateDeploymentDto, QueryDeploymentsDto } from './dto';

@ApiTags('deployments')
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get deployments (optionally filtered by agent or user)' })
  @ApiResponse({ status: 200, description: 'Deployments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: QueryDeploymentsDto, @Request() req: any) {
    return this.deploymentsService.findAll(query, req.user.wallet);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new deployment and install Safe module' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async create(@Body() createDeploymentDto: CreateDeploymentDto, @Request() req: any) {
    return this.deploymentsService.create(createDeploymentDto, req.user.wallet);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update deployment status (pause/resume/cancel)' })
  @ApiResponse({ status: 200, description: 'Deployment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not deployment owner' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDeploymentDto: UpdateDeploymentDto,
    @Request() req: any,
  ) {
    return this.deploymentsService.update(id, updateDeploymentDto, req.user.wallet);
  }
}
