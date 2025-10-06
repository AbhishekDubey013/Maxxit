import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto, QueryAgentsDto } from './dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated agent leaderboard' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  async findAll(@Query() query: QueryAgentsDto) {
    return this.agentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent details with recent performance' })
  @ApiResponse({ status: 200, description: 'Agent retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid weights' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createAgentDto: CreateAgentDto, @Request() req: any) {
    return this.agentsService.create(createAgentDto, req.user.wallet);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent status or weights (owner only)' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid weights' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not agent owner' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @Request() req: any,
  ) {
    return this.agentsService.update(id, updateAgentDto, req.user.wallet);
  }
}
