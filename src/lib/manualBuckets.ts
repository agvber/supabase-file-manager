// listBuckets 권한이 없는 인스턴스(storage.buckets에 select 정책이 없는 경우
// listBuckets가 빈 배열/오류를 돌려준다)를 위해, 사용자가 직접 추가한 버킷 이름을
// 호스트별로 localStorage에 보관한다. 개별 버킷의 객체 조작은 storage.objects
// RLS만 통과하면 되므로 이름만 알면 정상 동작한다.
function keyFor(url: string): string {
  try {
    return `sfm-manual-buckets-${new URL(url).hostname}`;
  } catch {
    return 'sfm-manual-buckets-default';
  }
}

export function getManualBuckets(url: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(url));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
  } catch {
    return [];
  }
}

export function addManualBucket(url: string, name: string): string[] {
  const next = [...getManualBuckets(url).filter((n) => n !== name), name];
  localStorage.setItem(keyFor(url), JSON.stringify(next));
  return next;
}

export function removeManualBucket(url: string, name: string): string[] {
  const next = getManualBuckets(url).filter((n) => n !== name);
  localStorage.setItem(keyFor(url), JSON.stringify(next));
  return next;
}
