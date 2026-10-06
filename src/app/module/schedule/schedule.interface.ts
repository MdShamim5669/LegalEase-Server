export interface IScheduleSlotItem {
  startDateTime: string | Date;
  endDateTime: string | Date;
}

export interface ICreateSchedulesPayload {
  slots: IScheduleSlotItem[];
}

export interface IUpdateSchedulePayload {
  startDateTime?: string | Date;
  endDateTime?: string | Date;
}
