import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  PaymentMethod,
  PaymentMethodValue,
} from '../../payment/payment-method';

export class CompleteOrderDto {
  @ApiPropertyOptional({
    enum: [PaymentMethodValue.CASH, PaymentMethodValue.CARD],
  })
  @IsOptional()
  @IsString()
  @IsIn([PaymentMethodValue.CASH, PaymentMethodValue.CARD])
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  waitingMinutes?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  stopMinutes?: number;
}
