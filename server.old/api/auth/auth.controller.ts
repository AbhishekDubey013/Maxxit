import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SiweDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('siwe')
  @ApiOperation({ summary: 'Sign-In with Ethereum' })
  @ApiResponse({ status: 200, description: 'JWT token issued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async siweLogin(@Body() siweDto: SiweDto) {
    return this.authService.siweLogin(siweDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.wallet);
  }
}
