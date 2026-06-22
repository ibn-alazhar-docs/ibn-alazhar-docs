import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDriveClient,
  ensureDriveFolder,
  uploadToDrive,
  downloadFromDrive,
} from "../../packages/pipeline/src/google-drive";
import { Readable } from "stream";
import { google } from "googleapis";

// Mock the googleapis module
vi.mock("googleapis", () => {
  const mOAuth2 = {
    setCredentials: vi.fn(),
  };
  const mOAuth2Client = vi.fn(() => mOAuth2);

  const mDrive = {
    files: {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
    },
  };

  return {
    google: {
      auth: {
        OAuth2: mOAuth2Client,
      },
      drive: vi.fn(() => mDrive),
    },
  };
});

describe("Google Drive Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDriveClient", () => {
    it("should initialize OAuth2 client and return drive instance", () => {
      const drive = getDriveClient("access_123", "refresh_123", "client_123", "secret_123");

      expect(google.auth.OAuth2).toHaveBeenCalledWith("client_123", "secret_123");
      const oauth2ClientInstance = vi.mocked(google.auth.OAuth2).mock.results[0]?.value;
      expect(oauth2ClientInstance.setCredentials).toHaveBeenCalledWith({
        access_token: "access_123",
        refresh_token: "refresh_123",
      });

      expect(google.drive).toHaveBeenCalledWith({
        version: "v3",
        auth: oauth2ClientInstance,
      });
      expect(drive).toBeDefined();
    });
  });

  describe("ensureDriveFolder", () => {
    it("should return existing folder ID if found", async () => {
      const mockDrive = {
        files: {
          list: vi.fn().mockResolvedValue({
            data: { files: [{ id: "existing_folder_id", name: "Ibn Al-Azhar" }] },
          }),
          create: vi.fn(),
        },
      } as any;

      const folderId = await ensureDriveFolder(mockDrive, "Ibn Al-Azhar");

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.folder' and name='Ibn Al-Azhar' and trashed=false",
        spaces: "drive",
        fields: "files(id, name)",
      });
      expect(mockDrive.files.create).not.toHaveBeenCalled();
      expect(folderId).toBe("existing_folder_id");
    });

    it("should create new folder and return ID if not found", async () => {
      const mockDrive = {
        files: {
          list: vi.fn().mockResolvedValue({
            data: { files: [] },
          }),
          create: vi.fn().mockResolvedValue({
            data: { id: "new_folder_id" },
          }),
        },
      } as any;

      const folderId = await ensureDriveFolder(mockDrive, "Ibn Al-Azhar");

      expect(mockDrive.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: "Ibn Al-Azhar",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      expect(folderId).toBe("new_folder_id");
    });

    it("should return empty string if file.id is missing", async () => {
      const mockDrive = {
        files: {
          list: vi.fn().mockResolvedValue({
            data: { files: [{ name: "Ibn Al-Azhar" }] }, // no id
          }),
        },
      } as any;
      const folderId = await ensureDriveFolder(mockDrive, "Ibn Al-Azhar");
      expect(folderId).toBe("");
    });

    it("should fallback to create if first file is null", async () => {
      const mockDrive = {
        files: {
          list: vi.fn().mockResolvedValue({
            data: { files: [null] },
          }),
          create: vi.fn().mockResolvedValue({
            data: { id: "new_id" },
          }),
        },
      } as any;
      const folderId = await ensureDriveFolder(mockDrive, "Ibn Al-Azhar");
      expect(folderId).toBe("new_id");
    });
  });

  describe("uploadToDrive", () => {
    it("should upload file buffer and return file ID", async () => {
      const mockDrive = {
        files: {
          create: vi.fn().mockResolvedValue({
            data: { id: "uploaded_file_id" },
          }),
        },
      } as any;

      const buffer = Buffer.from("test file content");
      const fileId = await uploadToDrive(mockDrive, "test.txt", "text/plain", buffer, "folder_123");

      expect(mockDrive.files.create).toHaveBeenCalled();
      const callArg = mockDrive.files.create.mock.calls[0][0];

      expect(callArg.requestBody.name).toBe("test.txt");
      expect(callArg.requestBody.parents).toEqual(["folder_123"]);
      expect(callArg.media.mimeType).toBe("text/plain");
      expect(callArg.media.body).toBeInstanceOf(Readable);

      expect(fileId).toBe("uploaded_file_id");
    });

    it("should upload stream and return file ID without folderId", async () => {
      const mockDrive = {
        files: {
          create: vi.fn().mockResolvedValue({
            data: { id: "stream_file_id" },
          }),
        },
      } as any;

      const stream = new Readable({
        read() {
          this.push("stream content");
          this.push(null);
        },
      });

      const fileId = await uploadToDrive(mockDrive, "stream.txt", "text/plain", stream);

      expect(mockDrive.files.create).toHaveBeenCalled();
      const callArg = mockDrive.files.create.mock.calls[0][0];

      expect(callArg.requestBody.name).toBe("stream.txt");
      expect(callArg.requestBody.parents).toBeUndefined();
      expect(callArg.media.mimeType).toBe("text/plain");
      expect(callArg.media.body).toBe(stream);

      expect(fileId).toBe("stream_file_id");
    });
  });

  describe("downloadFromDrive", () => {
    it("should download file and return Buffer", async () => {
      // Mock a readable stream containing the data
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from("file_content_here"));
          this.push(null);
        },
      });

      const mockDrive = {
        files: {
          get: vi.fn().mockResolvedValue({
            data: mockStream,
          }),
        },
      } as any;

      const buffer = await downloadFromDrive(mockDrive, "file_id_123");

      expect(mockDrive.files.get).toHaveBeenCalledWith(
        { fileId: "file_id_123", alt: "media" },
        { responseType: "stream" },
      );
      expect(buffer.toString()).toBe("file_content_here");
    });
  });
});
