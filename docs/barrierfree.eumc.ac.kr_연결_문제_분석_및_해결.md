# barrierfree.eumc.ac.kr 연결 문제 분석 및 해결 가이드

**최종 업데이트:** 2026년 1월 5일

## 현재 상황 요약

| 항목 | 상태 |
|------|------|
| https://remo-test.online/ | ✅ **정상 작동** (HTTP 200) |
| https://barrierfree.eumc.ac.kr/ | ❌ **연결 실패** (DNS CNAME 값 변경 필요) |
| 서버 설정 (cloudflared, nginx) | ✅ **완료** |
| Cloudflare Zero Trust Public Hostname | ✅ **등록 완료** |
| DNS CNAME 값 변경 | ⏳ **요청 필요** |

---

## 문제 분석

### 1. DNS 설정 확인 (정상)

```bash
$ dig CNAME barrierfree.eumc.ac.kr +short
49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com.
```

DNS CNAME 설정은 **정확히 완료**되었습니다. 전산팀 작업은 완료된 상태입니다.

---

### 2. 문제 발견: Cloudflare Tunnel 설정 누락

**현재 `/etc/cloudflared/config.yml` 설정:**
```yaml
tunnel: remo-tunnel
credentials-file: /home/finefit-temp/.cloudflared/49a156c2-21fd-4962-a01c-b09892255da6.json

ingress:
  - hostname: remo-test.online        # ← remo-test.online만 있음
    service: http://localhost:3111
  - service: http_status:404          # ← 그 외 모든 요청은 404 반환
```

**문제점:**
- `barrierfree.eumc.ac.kr` hostname이 ingress 규칙에 **없음**
- 따라서 해당 도메인으로 들어오는 요청은 마지막 catch-all 규칙에 걸려 **404 반환**

---

### 3. 문제 발견: Nginx 설정 누락

**현재 `/etc/nginx/sites-available/remo-test.online` 설정:**
```nginx
server {
    listen 3111;
    server_name remo-test.online www.remo-test.online;  # ← barrierfree.eumc.ac.kr 없음
    ...
}
```

**문제점:**
- `server_name`에 `barrierfree.eumc.ac.kr`이 **없음**
- Nginx가 해당 도메인 요청을 처리하지 못할 수 있음

---

## 트래픽 흐름 분석

### 현재 상태 (실패)

```
사용자: https://barrierfree.eumc.ac.kr/
        │
        ▼ DNS 조회 (정상)
CNAME → 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com
        │
        ▼ Cloudflare Tunnel 라우팅
cloudflared: ingress 규칙 확인
        │
        ▼ hostname: barrierfree.eumc.ac.kr 매칭 시도
        │
        ✗ 매칭되는 규칙 없음 → "http_status:404" 반환 → 연결 실패
```

### 정상 작동 시 (remo-test.online)

```
사용자: https://remo-test.online/
        │
        ▼ DNS 조회
Cloudflare Proxy IP (104.21.91.235)
        │
        ▼ Cloudflare Tunnel 라우팅
cloudflared: ingress 규칙 확인
        │
        ▼ hostname: remo-test.online 매칭 ✓
        │
        ▼ service: http://localhost:3111 (Nginx)
        │
        ▼ proxy_pass http://localhost:3112 (Next.js)
        │
        ✓ 정상 응답
```

---

## 해결 방법

### 필수 작업 2가지

DNS 설정은 이미 완료되었으므로, **서버 측 설정 2가지**만 추가하면 됩니다.

---

### 작업 1: Cloudflare Tunnel ingress 규칙 추가

**파일:** `/etc/cloudflared/config.yml`

**수정 전:**
```yaml
tunnel: remo-tunnel
credentials-file: /home/finefit-temp/.cloudflared/49a156c2-21fd-4962-a01c-b09892255da6.json

ingress:
  - hostname: remo-test.online
    service: http://localhost:3111
  - service: http_status:404
```

**수정 후:**
```yaml
tunnel: remo-tunnel
credentials-file: /home/finefit-temp/.cloudflared/49a156c2-21fd-4962-a01c-b09892255da6.json

ingress:
  - hostname: remo-test.online
    service: http://localhost:3111
  - hostname: barrierfree.eumc.ac.kr      # 추가
    service: http://localhost:3111         # 추가
  - service: http_status:404
```

**서비스 재시작:**
```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

---

### 작업 2: Nginx server_name 추가

**파일:** `/etc/nginx/sites-available/remo-test.online`

**수정 전:**
```nginx
server {
    listen 3111;
    server_name remo-test.online www.remo-test.online;
    ...
}
```

**수정 후:**
```nginx
server {
    listen 3111;
    server_name remo-test.online www.remo-test.online barrierfree.eumc.ac.kr;
    ...
}
```

**서비스 재시작:**
```bash
sudo nginx -t                    # 설정 검증
sudo systemctl reload nginx      # 무중단 재로드
```

---

## 수정 후 예상 트래픽 흐름

```
사용자: https://barrierfree.eumc.ac.kr/
        │
        ▼ DNS 조회
CNAME → 49a156c2-...cfargotunnel.com → Cloudflare
        │
        ▼ Cloudflare Tunnel 라우팅
cloudflared: ingress 규칙 확인
        │
        ▼ hostname: barrierfree.eumc.ac.kr 매칭 ✓
        │
        ▼ service: http://localhost:3111 (Nginx)
        │
        ▼ server_name: barrierfree.eumc.ac.kr 매칭 ✓
        │
        ▼ proxy_pass http://localhost:3112 (Next.js)
        │
        ✓ 정상 응답
```

---

## 작업 순서 요약

```bash
# 1. Cloudflared 설정 수정
sudo nano /etc/cloudflared/config.yml
# barrierfree.eumc.ac.kr ingress 규칙 추가

# 2. Cloudflared 재시작
sudo systemctl restart cloudflared

# 3. Nginx 설정 수정
sudo nano /etc/nginx/sites-available/remo-test.online
# server_name에 barrierfree.eumc.ac.kr 추가

# 4. Nginx 설정 검증 및 재로드
sudo nginx -t
sudo systemctl reload nginx

# 5. 연결 테스트
curl -I https://barrierfree.eumc.ac.kr/
```

---

## 검증 방법

### 1. DNS 확인 (이미 완료)
```bash
dig CNAME barrierfree.eumc.ac.kr +short
# 예상 결과: 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com.
```

### 2. Cloudflared 상태 확인
```bash
sudo systemctl status cloudflared
# Active: active (running) 확인
```

### 3. HTTP 응답 확인
```bash
curl -I https://barrierfree.eumc.ac.kr/
# HTTP/2 200 확인
```

### 4. 브라우저 접속 테스트
- https://barrierfree.eumc.ac.kr/ 접속
- 페이지가 정상적으로 로드되는지 확인

---

## 핵심 요약

| 구성 요소 | 현재 상태 | 필요 작업 |
|----------|----------|----------|
| DNS CNAME | ✅ 완료 | 없음 |
| Cloudflared ingress | ❌ 누락 | `barrierfree.eumc.ac.kr` 추가 |
| Nginx server_name | ❌ 누락 | `barrierfree.eumc.ac.kr` 추가 |

**결론:** DNS 설정만으로는 부족합니다. Cloudflare Tunnel과 Nginx에서 해당 도메인을 인식하도록 설정을 추가해야 합니다.

---

## 참고: 왜 DNS 설정만으로 안 되는가?

Cloudflare Tunnel은 단순한 포트 포워딩이 아닙니다:

1. **DNS CNAME**은 트래픽을 Cloudflare 네트워크로 보내는 역할만 함
2. **Cloudflare Tunnel (cloudflared)**이 어떤 hostname을 어떤 서비스로 라우팅할지 결정
3. **ingress 규칙에 없는 hostname**은 처리되지 않고 404 반환

이는 하나의 터널로 여러 도메인을 서비스할 수 있게 해주는 기능이지만, 반드시 각 도메인을 명시적으로 등록해야 합니다.

---

---

## 최종 해결 방법 (2026년 1월 5일 업데이트)

### 문제 발견

서버 설정과 Cloudflare Zero Trust Public Hostname 등록을 완료했으나, `cfargotunnel.com` 도메인이 **공개 IP를 반환하지 않아** 연결이 되지 않습니다.

```bash
$ dig 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com A +short
(응답 없음 - 공개 IP 없음)
```

### 해결: DNS CNAME 값 변경

**병원 전산팀에 CNAME 값 변경 요청 필요:**

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 레코드 타입 | CNAME | CNAME |
| Host | barrierfree | barrierfree |
| **값** | `49a156c2-...cfargotunnel.com` | **`remo-test.online`** |

### 전산팀 전달용

```
안녕하세요,

barrierfree.eumc.ac.kr DNS 설정에서 CNAME 값 변경이 필요합니다.

■ 변경 요청
  - 레코드 타입: CNAME
  - Host: barrierfree
  - 기존 값: 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com
  - 변경 값: remo-test.online

■ 변경 사유
  cfargotunnel.com 도메인이 공개 IP를 반환하지 않아 연결이 불가합니다.

감사합니다.
```

---

**작성일:** 2025년 12월 28일
**최종 업데이트:** 2026년 1월 5일
**상태:** DNS CNAME 값 변경 요청 필요
