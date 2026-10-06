export interface ICreateReviewPayload {
  consultationId: string;
  rating: number;
  comment?: string;
}

export interface IReviewFilterRequest {
  page?: number | string;
  limit?: number | string;
  lawyerId?: string;
  isHidden?: boolean | string;
}

export interface IUpdateReviewVisibilityPayload {
  isHidden: boolean;
}
