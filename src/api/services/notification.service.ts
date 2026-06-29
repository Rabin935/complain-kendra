import type { ComplaintStatus } from "../types";

type ComplaintStatusNotificationInput = {
  userId: string;
  complaintId: string;
  complaintNumber: string;
  status: ComplaintStatus;
};

export async function notifyComplaintStatusChange(
  input: ComplaintStatusNotificationInput,
): Promise<void> {
  console.log(
    `[notification] user=${input.userId} complaint=${input.complaintId} number=${input.complaintNumber} status=${input.status}`,
  );
}
