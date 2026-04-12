import { baseURL } from "../../../../app/utils/api";

type ReactNativePhotoFile = {
  uri: string;
  name?: string;
  type?: string;
};

interface UploadPhotoResponse {
  success: boolean;
  photoUrl?: string;
  message?: string;
}

export interface UploadPhotoInput {
  photo: Blob | ReactNativePhotoFile;
  authToken: string;
  fileName?: string;
  mimeType?: string;
}

function isBlobFile(photo: Blob | ReactNativePhotoFile): photo is Blob {
  return typeof Blob !== "undefined" && photo instanceof Blob;
}

export async function uploadPhoto({
  photo,
  authToken,
  fileName = "complaint-photo.jpg",
  mimeType = "image/jpeg",
}: UploadPhotoInput): Promise<string> {
  const formData = new FormData();

  if (isBlobFile(photo)) {
    formData.append("photo", photo, fileName);
  } else {
    formData.append(
      "photo",
      {
        uri: photo.uri,
        name: photo.name ?? fileName,
        type: photo.type ?? mimeType,
      } as unknown as Blob,
    );
  }

  const response = await fetch(`${baseURL}/api/complaints/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  const responseData = (await response
    .json()
    .catch(() => null)) as UploadPhotoResponse | null;

  if (!response.ok || !responseData?.success || !responseData.photoUrl) {
    throw new Error(responseData?.message ?? "Photo upload failed.");
  }

  return responseData.photoUrl;
}
