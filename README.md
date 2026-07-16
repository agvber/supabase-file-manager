# Supabase 파일 매니저 (supabase-file-manager)

Supabase Storage의 모든 버킷을 한 화면에서 탐색·관리하는 정적 웹.

## 주요 기능

- 다중 버킷 자동 조회 (`listBuckets`)
- 폴더 트리 탐색 + breadcrumb
- 파일/폴더 업로드(다중·드래그앤드롭) · 다운로드 · 이름 바꾸기 · 삭제
- 폴더 복사·이동 (재귀)
- 다중 선택 + bulk 삭제/이동/복사
- 행 드래그로 폴더 간 이동
- 우측 상세 패널 (MIME·크기·수정시각·공유 URL)
- 대용량 파일(500MB까지) tus-js-client resumable 업로드

## 사전 조건

- Node.js 18+
- Supabase 프로젝트 (self-hosted 또는 cloud)
- 운영자가 다음을 보유:
  - **API key**: anon public key (Studio → Settings → API) — 두 로그인 방식 공통
  - 로그인 방식에 따라 둘 중 하나:
    - **Auth Key (토큰)**: RLS를 통과할 Bearer JWT (보통 `service_role` key)
    - **이메일 로그인**: Supabase Auth에 등록된 이메일/비밀번호 계정 (Auth → Providers에서 Email provider 활성화 필요)

## 설치

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview
```

## 처음 사용

1. 앱 첫 진입 시 자동으로 `/settings`로 이동
2. 로그인 방식 선택:
   - **Auth Key (토큰)**: URL + API key + Auth key 입력 → 저장 시 `GET /storage/v1/bucket` smoke test
   - **이메일 로그인**: URL + API key + 이메일/비밀번호 입력 → 로그인 성공 자체가 검증 (JWT 세션 발급, 자동 갱신)
3. 통과하면 `/`에서 접근 가능한 버킷 카드 목록이 표시됨
   - 이메일 로그인인데 버킷이 안 보이면 오류가 아니라 해당 사용자에게 `storage.buckets`/`storage.objects` RLS 정책이 없는 것
4. 버킷 카드 클릭 → `/b/{bucket}/`로 진입, 폴더 탐색 시작

## 폴더 모델

Supabase Storage의 폴더는 객체 경로의 prefix로 표현되는 가상 개념입니다.
이 앱은 빈 폴더를 만들기 위해 `.emptyFolderPlaceholder`라는 0바이트 파일을 업로드합니다.

## 키 단축

- 폴더 행 클릭 → 진입
- 폴더 행 + 체크박스 → 선택만 (진입 안 함)
- 행 드래그 → 폴더에 드롭하면 이동
- OS 파일 드래그 → 영역에 드롭하면 업로드

## 보안 ⚠

- Auth key가 `service_role`이면 DB 전체 권한입니다. 외부 노출 금지. `service_role` 노출 없이 RLS 정책으로 권한을 좁힐 수 있는 **이메일 로그인 방식을 권장**합니다.
- 키는 브라우저 localStorage에만 저장됩니다. 이메일 로그인 시 세션 토큰(access + refresh)도 localStorage(`sfm-auth-<host>`)에 저장되며, 비밀번호는 저장되지 않습니다.
- 공용 PC에서는 사용 후 설정 페이지의 "지우기"를 누르세요. 이메일 로그인 상태였다면 로그아웃까지 함께 처리됩니다.

## 배포 (GitHub Pages)

- 라이브: `https://<user>.github.io/supabase-file-manager/`
- `main` 브랜치에 push → GitHub Actions가 자동 빌드 + 배포
- `dist/index.html`을 `dist/404.html`로 복사해 SPA deep-link 지원
- CSP/HSTS 헤더가 필요하면 Cloudflare Pages/Vercel/Netlify로 이전 권장

## 제약 / 범위 외

- ZIP 일괄 다운로드
- 이미지/텍스트 미리보기 (속성 패널만)
- 버킷 만들기/삭제 UI (현재는 Studio에서 직접)
- 검색/필터, 사용자 정의 정렬
