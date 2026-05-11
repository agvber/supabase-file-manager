# 태블릿 APK 버전 관리

Supabase Storage(`tablet-apk` 버킷)에 태블릿 앱 APK를 트랙별(production / beta / dev)로 업로드·관리하는 정적 웹.

---

## 사전 조건

- Node.js 18+
- Supabase 프로젝트
- `tablet-apk` 버킷이 생성되어 있고, 운영자가 다음 두 가지를 보유:
  - **API key**: anon public key (Supabase Studio → Settings → API)
  - **Auth key**: RLS를 통과할 수 있는 Bearer JWT (예: `service_role` key 또는 적절한 사용자 JWT)

---

## 설치 및 실행

```bash
npm install
npm run dev        # 개발 서버 — http://localhost:5173
npm run build
npm run preview
```

---

## 처음 사용 흐름

1. 브라우저에서 앱 열기 → `/settings`로 자동 리다이렉트
2. 세 가지 입력 후 "저장":
   - **Supabase URL** — 예: `https://service.lightweight.run`
   - **API key (anon)** — Studio → Settings → API → `anon` `public` key
   - **Auth key (Bearer JWT)** — `service_role` key 또는 RLS를 통과할 수 있는 사용자 JWT
3. 저장 시 `POST /storage/v1/object/list/tablet-apk`로 smoke test → 통과하면 대시보드(`/`)로 이동
4. 대시보드에서 트랙 선택 → APK 업로드/다운로드/삭제 (별도 로그인 없음 — 입력한 두 key를 모든 요청에 헤더로 부착)

---

## 트랙 구조

모든 APK는 버킷 `tablet-apk` 내 다음 폴더에 저장됨:

| 트랙 | 경로 |
|------|------|
| production | `production/` |
| beta | `beta/` |
| dev | `dev/` |

같은 이름으로 업로드 시 덮어쓰기됩니다.

---

## 대용량 업로드

- `tus-js-client`를 통해 Supabase Storage `/storage/v1/upload/resumable` 엔드포인트로 resumable 업로드합니다.
- 청크 크기는 6MB로 고정 (Supabase 요구사항).
- 단일 파일 최대 500MB (서버 글로벌 설정).

---

## 보안 ⚠

- **Auth key가 `service_role`이면 DB 전체 권한입니다. 외부 노출 절대 금지.** 의심 시 Studio → Settings → API에서 즉시 rotate.
- 키들은 브라우저 localStorage에 저장됩니다. 공용 PC에서는 사용 후 설정 페이지의 "지우기"를 눌러 지워주세요.
- 우리 앱은 로그인 UI를 두지 않습니다. 운영자가 외부에서 발급받은 Bearer 토큰을 입력하는 것이 곧 인증입니다.
- 만약 anon key + 더 좁은 권한으로 운영하고 싶다면 `tablet-apk` 버킷의 RLS를 `TO anon, authenticated USING (true)` 형태로 완화하고 Auth key 칸에도 anon key를 그대로 입력하세요.

## 배포 (GitHub Pages)

이 레포는 `main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다.

- 배포 URL: `https://<user>.github.io/apk-uploader/`
- 베이스 경로: `/apk-uploader/` (Vite `base` + React Router `basename` 자동 매칭)
- SPA 라우팅: 빌드 시 `dist/index.html`을 `dist/404.html`로 복사해 GitHub Pages가 deep-link도 SPA로 처리하도록 함
- 워크플로: `.github/workflows/deploy.yml`
- 사이트 헤더(CSP/HSTS 등): GitHub Pages는 사용자 정의 헤더를 지원하지 않습니다. 보안 강화가 필요하면 Cloudflare Pages/Vercel/Netlify로 이전하세요.
