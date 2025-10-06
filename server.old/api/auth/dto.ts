import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SiweDto {
  @ApiProperty({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @ApiProperty({ example: 'signature_placeholder' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ example: 'message_placeholder' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
