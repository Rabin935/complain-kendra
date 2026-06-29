import { baseURL } from "../../../utils/api";
import type { AnalyzeResponse, ComplaintResponse, ComplaintsListResponse, CreateComplaintData } from "../types/complaint.types";

export interface UploadPhotoInput {
  photo: {
    uri: string;
    name?: string;
    type?: string;
  };
  authToken: string;
  fileName?: string;
  mimeType?: string;
}

export async function uploadPhoto({
  photo,
  authToken,
  fileName = "complaint-photo.jpg",
  mimeType = "image/jpeg",
}: UploadPhotoInput): Promise<string> {
  const formData = new FormData();

  formData.append("photo", {
    uri: photo.uri,
    name: photo.name ?? fileName,
    type: photo.type ?? mimeType,
  } as unknown as Blob);

  const response = await fetch(`${baseURL}/api/complaints/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Photo upload failed.");
  }

  const data = (await response.json()) as { success: boolean; photoUrl?: string; message?: string };

  if (!data.success || !data.photoUrl) {
    throw new Error(data?.message ?? "Photo upload failed.");
  }

  return data.photoUrl;
}

export async function analyzeComplaint(
  description: string,
  photoUrl: string | undefined,
  authToken: string,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${baseURL}/api/complaints/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      photoUrl,
    }),
  });

  if (!response.ok) {
    throw new Error("Analysis failed.");
  }

  const data = (await response.json()) as AnalyzeResponse;

  if (!data.success) {
    throw new Error(data?.message ?? "Analysis failed.");
  }

  return data;
}

export async function createComplaint(
  data: CreateComplaintData,
  authToken: string,
): Promise<ComplaintResponse> {
  const response = await fetch(`${baseURL}/api/complaints`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create complaint.");
  }

  const responseData = (await response.json()) as ComplaintResponse;

  if (!responseData.success) {
    throw new Error(responseData?.message ?? "Failed to create complaint.");
  }

  return responseData;
}

export async function getMyComplaints(authToken: string): Promise<ComplaintsListResponse> {
  const response = await fetch(`${baseURL}/api/complaints/my`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch complaints.");
  }

  const data = (await response.json()) as ComplaintsListResponse;

  if (!data.success) {
    throw new Error(data?.message ?? "Failed to fetch complaints.");
  }

  return data;
}

export async function getAllComplaints(authToken: string): Promise<ComplaintsListResponse> {
  const response = await fetch(`${baseURL}/api/complaints`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch complaints.");
  }

  const data = (await response.json()) as ComplaintsListResponse;

  if (!data.success) {
    throw new Error(data?.message ?? "Failed to fetch complaints.");
  }

  return data;
}
