# 태블릿 APK 버전 관리

Supabase Storage(`tablet-apk` 버킷)에 태블릿 앱 APK를 트랙별(production / beta / dev)로 업로드·관리하는 정적 웹.

---

## 사전 조건

- Node.js 18+
- Supabase 프로젝트
- `tablet-apk` 버킷이 생성되어 있고, RLS는 `gyms.auth = auth.uid()`인 인증 사용자에게 SELECT/INSERT/UPDATE/DELETE 허용

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
2. Supabase URL과 anon public key를 입력하고 저장 (Supabase 프로젝트 → Settings → API)
3. `/login`에서 gym 계정(이메일/비밀번호)으로 로그인
4. 대시보드에서 트랙 선택 → APK 업로드/다운로드/삭제

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

## 보안

- Supabase URL/anon key는 브라우저 localStorage에 저장됩니다. 공용 PC에서는 사용 후 설정 페이지의 "지우기"를 눌러 지워주세요.
- 모든 권한은 RLS로 제어되므로 anon key만으로는 권한 없는 접근이 차단됩니다.
