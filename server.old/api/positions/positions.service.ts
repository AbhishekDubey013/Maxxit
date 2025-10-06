import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { QueryPositionsDto } from './dto';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryPositionsDto) {
    const { deploymentId, status, limit = 20, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (deploymentId) where.deploymentId = deploymentId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          deployment: {
            select: {
              id: true,
              userWallet: true,
              agent: {
                select: {
                  id: true,
                  name: true,
                  venue: true,
                },
              },
            },
          },
          signal: {
            select: {
              id: true,
              tokenSymbol: true,
              side: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.position.count({ where }),
    ]);

    const enrichedData = data.map(position => {
      let calculatedPnl = position.pnl ? parseFloat(position.pnl.toString()) : null;
      
      if (position.status === 'OPEN' && position.exitPrice) {
        const entryPrice = parseFloat(position.entryPrice.toString());
        const exitPrice = parseFloat(position.exitPrice.toString());
        const qty = parseFloat(position.qty.toString());
        
        if (position.side === 'LONG' || position.side === 'BUY') {
          calculatedPnl = (exitPrice - entryPrice) * qty;
        } else {
          calculatedPnl = (entryPrice - exitPrice) * qty;
        }
      }

      return {
        ...position,
        calculatedPnl,
      };
    });

    return {
      data: enrichedData,
      total,
      page,
      limit,
    };
  }
}
