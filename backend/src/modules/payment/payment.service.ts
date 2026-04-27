import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { PaymentMethod, PaymentMethodValue } from './payment-method';
import { PaymentStatusValue } from './payment-status';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  createPendingPayment(
    rideId: string,
    userId: string,
    amount: number,
    method: PaymentMethod = PaymentMethodValue.CASH,
  ) {
    return this.prisma.payment.create({
      data: {
        rideId,
        userId,
        amount,
        method,
        commissionAmount: this.calculateCommission(amount),
        status: PaymentStatusValue.PENDING,
      },
    });
  }

  calculateCommission(amount: number) {
    return Math.round(amount * 0.12);
  }

  markPaid(rideId: string) {
    return this.prisma.payment.update({
      where: { rideId },
      data: { status: PaymentStatusValue.PAID },
    });
  }
}
