import * as tus from 'tus-js-client';

export type UploadParams = {
  supabaseUrl: string;
  apiKey: string; // anon key — supabase-js가 모든 요청에 붙이는 apikey 헤더와 동일하게 전달
  accessToken: string;
  bucket: string;
  objectPath: string;
  file: File;
  contentType?: string;
  upsert?: boolean;
  onProgress?: (loaded: number, total: number) => void;
};

// Supabase 클라우드(<ref>.supabase.co)의 resumable 업로드는 공식 문서가 안내하는
// 전용 스토리지 도메인(<ref>.storage.supabase.co)으로 보낸다. 메인 도메인의 tus 경로는
// API 게이트웨이를 거치며 브라우저에서 생성 POST만 반복되고 PATCH로 진행되지 않는
// 실패 사례가 있다. self-hosted URL은 그대로 둔다.
function tusEndpointBase(supabaseUrl: string): string {
  const cleaned = supabaseUrl.replace(/\/$/, '');
  try {
    const host = new URL(cleaned).hostname;
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (m) return `https://${m[1]}.storage.supabase.co`;
  } catch {
    /* 비정형 URL은 아래 fallback */
  }
  return cleaned;
}

// Supabase 자체 호스팅 storage 서비스가 X-Forwarded-Proto/Host를 못 받으면
// Location 헤더에 내부 URL(http://host:8000/upload/resumable/...)을 돌려준다.
// HTTPS 페이지에서는 mixed-content로 차단되므로, 응답 시점에 Location 헤더를
// 공개 URL로 rewrite하는 전역 XHR 패치를 설치한다.
function ensureLocationRewrite(publicOrigin: string): void {
  if (xhrPatchInstalled) return;
  xhrPatchInstalled = true;
  const origGetHeader = XMLHttpRequest.prototype.getResponseHeader;
  XMLHttpRequest.prototype.getResponseHeader = function (name: string): string | null {
    const value = origGetHeader.call(this, name);
    if (typeof value !== 'string') return value;
    if (name.toLowerCase() !== 'location') return value;
    return rewriteIfNeeded(value, publicOrigin);
  };
}
let xhrPatchInstalled = false;

function rewriteIfNeeded(rawUrl: string, publicOrigin: string): string {
  try {
    const target = new URL(rawUrl);
    const expected = new URL(publicOrigin);
    if (target.hostname !== expected.hostname) return rawUrl;
    // 같은 호스트인데 protocol/port가 다르거나 /storage/v1 prefix가 빠진 경우 보정
    target.protocol = expected.protocol;
    target.port = expected.port;
    if (!target.pathname.startsWith('/storage/v1/')) {
      target.pathname = '/storage/v1' + target.pathname;
    }
    return target.toString();
  } catch {
    return rawUrl;
  }
}

export function uploadResumable(params: UploadParams): {
  promise: Promise<void>;
  abort: () => void;
} {
  const {
    supabaseUrl,
    apiKey,
    accessToken,
    bucket,
    objectPath,
    file,
    contentType = 'application/vnd.android.package-archive',
    upsert = true,
    onProgress,
  } = params;

  const cleanedUrl = supabaseUrl.replace(/\/$/, '');
  const endpoint = tusEndpointBase(supabaseUrl) + '/storage/v1/upload/resumable';
  // self-hosted에서 Location이 내부 URL로 오는 경우 보정 — 클라우드 전용 도메인의
  // Location은 호스트가 달라 rewrite 대상에서 자연히 제외된다.
  ensureLocationRewrite(cleanedUrl);

  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    apikey: apiKey,
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
      // 이전 세션의 URL로 resume을 시도하면 stale한 내부 URL을 잡을 수 있어
      // 매번 고유 fingerprint를 만들어 사실상 resume을 비활성화
      fingerprint: () =>
        Promise.resolve(`no-resume-${Date.now()}-${Math.random().toString(36).slice(2)}`),
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
