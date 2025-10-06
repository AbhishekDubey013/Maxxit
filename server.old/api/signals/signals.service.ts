import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { QuerySignalsDto } from './dto';

@Injectable()
export class SignalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySignalsDto) {
    const { agentId, tokenSymbol, from, to, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (tokenSymbol) where.tokenSymbol = tokenSymbol;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.signal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              venue: true,
            },
          },
        },
      }),
      this.prisma.signal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
