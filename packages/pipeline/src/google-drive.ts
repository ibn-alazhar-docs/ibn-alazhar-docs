import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

export function getDriveClient(
  accessToken: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function ensureDriveFolder(
  drive: drive_v3.Drive,
  folderName: string = "Ibn Al-Azhar",
): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
  const res = await drive.files.list({ q, spaces: "drive", fields: "files(id, name)" });

  if (res.data.files && res.data.files.length > 0) {
    const file = res.data.files[0];
    if (file) return file.id || "";
  }

  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });
  return createRes.data.id!;
}

export async function uploadToDrive(
  drive: drive_v3.Drive,
  fileName: string,
  mimeType: string,
  bufferOrStream: Buffer | NodeJS.ReadableStream,
  folderId?: string,
): Promise<string> {
  const media = {
    mimeType,
    body: bufferOrStream instanceof Buffer ? Readable.from(bufferOrStream) : bufferOrStream,
  };

  const fileMetadata: drive_v3.Schema$File = {
    name: fileName,
  };
  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });

  return res.data.id!;
}

export async function downloadFromDrive(drive: drive_v3.Drive, fileId: string): Promise<Buffer> {
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.data
      .on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks)));
  });
}
