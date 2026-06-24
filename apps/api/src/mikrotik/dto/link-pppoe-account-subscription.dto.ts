import { IsInt } from 'class-validator';

export class LinkPppoeAccountSubscriptionDto {
  @IsInt()
  subscriptionId: number;
}
