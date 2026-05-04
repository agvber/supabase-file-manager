import { Link } from 'react-router-dom';
import { getConfig } from '../lib/config';

export function ConfigBanner() {
  const config = getConfig();
  if (config) return null;

  return (
    <div className="config-banner">
      Supabase 설정이 필요합니다.{' '}
      <Link to="/settings">설정 페이지</Link>에서 URL과 anon key를 먼저 입력하세요.
    </div>
  );
}
