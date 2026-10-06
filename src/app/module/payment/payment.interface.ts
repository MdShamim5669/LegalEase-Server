export interface IRefundPaymentPayload {
  reason?: string;
}

export interface IPaymentFilterRequest {
  page?: number | string;
  limit?: number | string;
  status?: string;
}
