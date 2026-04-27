import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaymentMethod, PaymentMethodValue } from '../../payment/payment-method';

export class CompleteOrderDto {
  @IsOptional()
  @IsString()
  @IsIn([PaymentMethodValue.CASH, PaymentMethodValue.CARD])
  paymentMethod?: PaymentMethod;
}
