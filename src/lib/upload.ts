import * as tus from 'tus-js-client';

export type UploadParams = {
  supabaseUrl: string;
  accessToken: string;
  bucket: string;
  objectPath: string;
  file: File;
  contentType?: string;
  upsert?: boolean;
  onProgress?: (loaded: number, total: number) => void;
};

export function uploadResumable(params: UploadParams): {
  promise: Promise<void>;
  abort: () => void;
} {
  const {
    supabaseUrl,
    accessToken,
    bucket,
    objectPath,
    file,
    contentType = 'application/vnd.android.package-archive',
    upsert = true,
    onProgress,
  } = params;

  const endpoint = supabaseUrl.replace(/\/$/, '') + '/storage/v1/upload/resumable';

  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
  };
  if (upsert) {
    headers['x-upsert'] = 'true';
  }

  let upload: tus.Upload | undefined;

  const promise = new Promise<void>((resolve, reject) => {
    upload = new tus.Upload(file, {
      endpoint,
      headers,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: objectPath,
        contentType,
        cacheControl: '3600',
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress) {
          onProgress(bytesUploaded, bytesTotal);
        }
      },
      onSuccess() {
        resolve();
      },
      onError(error) {
        reject(error);
      },
    });
    upload.start();
  });

  const abort = () => {
    if (upload) upload.abort(true);
  };

  return { promise, abort };
}
