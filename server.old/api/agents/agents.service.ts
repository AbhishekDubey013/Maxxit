import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { validateWeights } from '../../shared/validation';
import { CreateAgentDto, UpdateAgentDto, QueryAgentsDto } from './dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryAgentsDto) {
    const { venue, status, sort, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (venue) where.venue = venue;
    if (status) where.status = status;

    const orderBy: any = {};
    if (sort === 'apr30d') {
      orderBy.apr30d = 'desc';
    } else if (sort === 'apr90d') {
      orderBy.apr90d = 'desc';
    } else if (sort === 'sharpe30d') {
      orderBy.sharpe30d = 'desc';
    } else {
      orderBy.apr30d = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          venue: true,
          status: true,
          apr30d: true,
          apr90d: true,
          aprSi: true,
          sharpe30d: true,
          creatorWallet: true,
        },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        deployments: {
          select: {
            id: true,
            userWallet: true,
            status: true,
            subActive: true,
          },
          take: 10,
        },
        pnlSnapshots: {
          orderBy: { day: 'desc' },
          take: 30,
          select: {
            day: true,
            pnl: true,
            returnPct: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async create(createAgentDto: CreateAgentDto, creatorWallet: string) {
    const validation = validateWeights(createAgentDto.weights);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const agent = await this.prisma.agent.create({
      data: {
        ...createAgentDto,
        creatorWallet,
        status: 'DRAFT',
      },
    });

    return agent;
  }

  async update(id: string, updateAgentDto: UpdateAgentDto, userWallet: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (agent.creatorWallet !== userWallet) {
      throw new ForbiddenException('Only the agent creator can update it');
    }

    if (updateAgentDto.weights) {
      const validation = validateWeights(updateAgentDto.weights);
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }
    }

    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: updateAgentDto,
    });

    return updatedAgent;
  }
}
