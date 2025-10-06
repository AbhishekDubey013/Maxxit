import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { RelayerService } from '../../adapters/relayer.service';
import { CreateDeploymentDto, UpdateDeploymentDto, QueryDeploymentsDto } from './dto';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private relayerService: RelayerService,
  ) {}

  async findAll(query: QueryDeploymentsDto, userWallet?: string) {
    const { agentId, me, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (me === 1 && userWallet) where.userWallet = userWallet;

    const [data, total] = await Promise.all([
      this.prisma.agentDeployment.findMany({
        where,
        skip,
        take: limit,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              venue: true,
              status: true,
            },
          },
        },
        orderBy: { subStartedAt: 'desc' },
      }),
      this.prisma.agentDeployment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async create(createDeploymentDto: CreateDeploymentDto, userWallet: string) {
    const { agentId, safeWallet } = createDeploymentDto;

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    if (agent.status !== 'ACTIVE') {
      throw new BadRequestException('Agent must be ACTIVE to deploy');
    }

    const existing = await this.prisma.agentDeployment.findUnique({
      where: {
        userWallet_agentId: {
          userWallet,
          agentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Deployment already exists for this agent');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const nextBillingAt = new Date(trialEndsAt);
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);

    const deployment = await this.prisma.agentDeployment.create({
      data: {
        agentId,
        userWallet,
        safeWallet,
        status: 'ACTIVE',
        trialEndsAt,
        nextBillingAt,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            venue: true,
          },
        },
      },
    });

    try {
      await this.relayerService.installModule(safeWallet);
    } catch (error) {
      console.error('Failed to install module:', error);
    }

    return deployment;
  }

  async update(id: string, updateDeploymentDto: UpdateDeploymentDto, userWallet: string) {
    const deployment = await this.prisma.agentDeployment.findUnique({
      where: { id },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }

    if (deployment.userWallet !== userWallet) {
      throw new ForbiddenException('Only the deployment owner can update it');
    }

    const updatedDeployment = await this.prisma.agentDeployment.update({
      where: { id },
      data: { status: updateDeploymentDto.status },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            venue: true,
          },
        },
      },
    });

    return updatedDeployment;
  }
}
