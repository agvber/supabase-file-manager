import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

// 옛날 tus-js-client가 localStorage에 저장한 fingerprint(stale한 내부 storage URL)
// 정리. 이게 남아 있으면 같은 파일을 다시 업로드할 때 resume 시도가 실패한다.
for (let i = localStorage.length - 1; i >= 0; i--) {
  const k = localStorage.key(i);
  if (k && k.startsWith('tus::')) localStorage.removeItem(k);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
