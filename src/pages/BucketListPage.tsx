import { useEffect } from 'react';
import { Database } from 'lucide-react';

export function BucketListPage() {
  useEffect(() => {
    document.title = '파일 매니저';
  }, []);

  return (
    <div className="bucket-placeholder">
      <div className="bucket-placeholder-icon">
        <Database size={40} strokeWidth={1.25} />
      </div>
      <div className="bucket-placeholder-text">버킷을 선택하세요</div>
      <div className="bucket-placeholder-hint">
        왼쪽 사이드바에서 버킷을 클릭하면 파일을 탐색할 수 있습니다.
        <br />
        버킷이 보이지 않으면 목록 조회 권한이 없는 것일 수 있습니다 — 사이드바의
        &lsquo;버킷 직접 추가&rsquo;로 이름을 입력해 사용하세요.
      </div>
    </div>
  );
}
