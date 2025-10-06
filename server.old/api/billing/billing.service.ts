import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { QueryBillingDto } from './dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryBillingDto) {
    const { deploymentId, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (deploymentId) where.deploymentId = deploymentId;

    const [data, total] = await Promise.all([
      this.prisma.billingEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          deployment: {
            select: {
              id: true,
              userWallet: true,
              agent: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          position: {
            select: {
              id: true,
              tokenSymbol: true,
              pnl: true,
            },
          },
        },
      }),
      this.prisma.billingEvent.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
