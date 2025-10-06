import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma.service';
import { SiweDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async siweLogin(siweDto: SiweDto): Promise<{ accessToken: string; wallet: string }> {
    // TODO: Implement actual SIWE signature verification
    // For now, placeholder implementation that accepts any wallet
    const { wallet } = siweDto;
    
    // Generate JWT token
    const payload = { wallet };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      wallet,
    };
  }

  async getMe(wallet: string) {
    const deployments = await this.prisma.agentDeployment.findMany({
      where: { userWallet: wallet },
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
    });

    return {
      wallet,
      deployments: deployments.map(d => ({
        id: d.id,
        agentId: d.agentId,
        agentName: d.agent.name,
        venue: d.agent.venue,
        status: d.status,
        subActive: d.subActive,
        safeWallet: d.safeWallet,
      })),
    };
  }
}
