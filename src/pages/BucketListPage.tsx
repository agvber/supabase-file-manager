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
      </div>
    </div>
  );
}
