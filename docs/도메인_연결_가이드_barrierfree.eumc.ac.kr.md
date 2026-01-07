# barrierfree.eumc.ac.kr 도메인 연결 가이드

## 요약 (전산팀 전달용)

### 결론: A 레코드가 아닌 CNAME 레코드 필요

| 항목 | 값 |
|------|-----|
| **연결할 서브도메인** | barrierfree.eumc.ac.kr |
| **권장 DNS 레코드 타입** | **CNAME** (A 레코드 아님) |
| **CNAME 값** | `remo-test.online` |

```
barrierfree.eumc.ac.kr  CNAME  remo-test.online
```

> **중요**: A 레코드(공인 IP 직접 지정)는 현재 환경에서 **사용 불가**합니다. 아래에 그 이유와 대안을 설명합니다.

---

## 현재 상황 분석

### 서버 정보
| 항목 | 값 |
|------|-----|
| 서버 공인 IP | `49.168.236.221` |
| 서버 위치 | finefittemp-desktop (로컬 서버) |
| Next.js 포트 | 3112 |
| Nginx 포트 | 3111 |

### 현재 remo-test.online DNS
```
remo-test.online → 104.21.91.235 (Cloudflare Proxy IP)
remo-test.online → 172.67.181.233 (Cloudflare Proxy IP)
```

> 이 IP들은 **Cloudflare의 프록시 IP**이며, 실제 서버 IP가 아닙니다.

---

## A 레코드를 사용할 수 없는 이유

### 문제점

```
┌─────────────────────────────────────────────────────────────────┐
│  A 레코드 방식 (불가능)                                          │
│                                                                 │
│  barrierfree.eumc.ac.kr  →  A 레코드  →  49.168.236.221        │
│                                              │                  │
│                                              ▼                  │
│                                    서버 80/443 포트 필요        │
│                                              │                  │
│                                              ✗ 사용 불가        │
└─────────────────────────────────────────────────────────────────┘
```

| 조건 | 현재 상태 | 문제 |
|------|----------|------|
| 80번 포트 (HTTP) | **사용 불가** | 다른 서비스 또는 권한 문제 |
| 443번 포트 (HTTPS) | **사용 불가** | SSL 인증서 관리 필요 |
| 공인 IP 직접 접근 | **불가능** | 표준 포트 없이 웹 접속 불가 |

### A 레코드 테스트 결과 예상
```bash
# 만약 A 레코드로 설정한다면:
barrierfree.eumc.ac.kr → 49.168.236.221

# 사용자가 접속 시도:
https://barrierfree.eumc.ac.kr/  →  49.168.236.221:443  →  연결 거부 ✗
http://barrierfree.eumc.ac.kr/   →  49.168.236.221:80   →  연결 거부 ✗
```

---

## 최적의 해결 방법

### 방법 1: CNAME 레코드 사용 (권장 - 가장 간단)

```
┌─────────────────────────────────────────────────────────────────┐
│  CNAME 방식 (권장)                                               │
│                                                                 │
│  barrierfree.eumc.ac.kr                                         │
│           │                                                     │
│           ▼ CNAME                                               │
│  remo-test.online                                               │
│           │                                                     │
│           ▼ Cloudflare Proxy                                    │
│  104.21.91.235 / 172.67.181.233                                 │
│           │                                                     │
│           ▼ Cloudflare Tunnel                                   │
│  localhost:3111 (Nginx) → localhost:3112 (Next.js)             │
└─────────────────────────────────────────────────────────────────┘
```

#### 전산팀 DNS 설정
```
타입: CNAME
이름: barrierfree
값: remo-test.online
TTL: 3600 (또는 자동)
```

#### 장점
- 설정이 가장 간단함
- 추가 서버 작업 불필요
- 기존 Cloudflare Tunnel 인프라 그대로 활용
- SSL 인증서는 Cloudflare에서 자동 관리

#### 단점
- URL 주소창에 remo-test.online으로 표시될 수 있음 (일부 브라우저)
- Cloudflare 서비스 의존성

---

### 방법 2: Cloudflare Tunnel에 새 도메인 추가 (권장 - 완전한 방식)

eumc.ac.kr 도메인을 **직접 Cloudflare에 등록하지 않고도** 연결 가능합니다.

#### 단계 1: Cloudflare Tunnel 설정 수정

`/etc/cloudflared/config.yml` 수정:
```yaml
tunnel: remo-tunnel
credentials-file: /home/finefit-temp/.cloudflared/49a156c2-21fd-4962-a01c-b09892255da6.json

ingress:
  - hostname: remo-test.online
    service: http://localhost:3111
  - hostname: barrierfree.eumc.ac.kr    # 새로 추가
    service: http://localhost:3111       # 새로 추가
  - service: http_status:404
```

#### 단계 2: Cloudflared 재시작
```bash
sudo systemctl restart cloudflared
```

#### 단계 3: Cloudflare 대시보드에서 Public Hostname 추가
1. Cloudflare 대시보드 → Zero Trust → Networks → Tunnels
2. remo-tunnel 선택 → Configure
3. Public Hostnames 탭 → Add a public hostname
4. 설정:
   - Subdomain: `barrierfree`
   - Domain: `eumc.ac.kr` (외부 도메인)
   - Service: `HTTP://localhost:3111`

#### 단계 4: 전산팀 DNS 설정

Cloudflare Tunnel은 외부 도메인 연결 시 **CNAME 레코드**가 필요합니다:

```
타입: CNAME
이름: barrierfree
값: 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com
TTL: 3600
```

> **참고**: 터널 ID 기반 CNAME은 `{터널ID}.cfargotunnel.com` 형식입니다.

---

### 방법 3: Nginx 추가 설정 (선택적)

방법 2 사용 시, Nginx에서 새 도메인 처리를 위해 설정 업데이트:

`/etc/nginx/sites-available/remo-test.online` 수정:
```nginx
server {
    listen 3111;
    server_name remo-test.online www.remo-test.online barrierfree.eumc.ac.kr;

    location / {
        proxy_pass http://localhost:3112;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 전산팀 전달 내용 요약

### 옵션 A: 간단한 CNAME (즉시 적용 가능)

```
레코드 타입: CNAME
호스트: barrierfree
값: remo-test.online
```

### 옵션 B: Cloudflare Tunnel CNAME (서버 설정 후)

```
레코드 타입: CNAME
호스트: barrierfree
값: 49a156c2-21fd-4962-a01c-b09892255da6.cfargotunnel.com
```

### A 레코드를 사용해야 하는 경우 (비권장)

만약 **반드시 A 레코드**를 사용해야 한다면, 다음 조건이 필요합니다:
1. 서버에서 80번 또는 443번 포트 개방
2. SSL 인증서 직접 관리 (Let's Encrypt 등)
3. 방화벽 인바운드 규칙 설정

이 경우 공인 IP: `49.168.236.221`

> **경고**: 현재 80번 포트 사용이 불가하므로 A 레코드 방식은 권장하지 않습니다.

---

## 비교표

| 방식 | DNS 타입 | 설정값 | 서버 작업 | 난이도 | 권장 |
|------|---------|--------|----------|--------|------|
| 방법 1 | CNAME | remo-test.online | 없음 | 쉬움 | ⭐⭐⭐ |
| 방법 2 | CNAME | {터널ID}.cfargotunnel.com | Cloudflare 설정 | 보통 | ⭐⭐⭐ |
| A 레코드 | A | 49.168.236.221 | 80포트 필요 | 불가능 | ❌ |

---

## 결론

**전산팀에 전달할 내용:**

```
안녕하세요,

barrierfree.eumc.ac.kr 도메인 연결 관련하여 답변드립니다.

현재 저희 서버는 보안 및 네트워크 정책상 80/443 포트를 직접 사용하지 않고,
Cloudflare Tunnel을 통해 서비스하고 있습니다.

따라서 A 레코드(공인 IP) 방식이 아닌 CNAME 레코드 설정이 필요합니다.

■ DNS 설정 요청
  - 레코드 타입: CNAME
  - 호스트명: barrierfree
  - 값: remo-test.online

위와 같이 설정해 주시면 정상적으로 연결됩니다.

감사합니다.
```

---

## 참고: Cloudflare Tunnel 구조

```
인터넷 사용자
      │
      ▼ HTTPS (443)
┌─────────────────┐
│  Cloudflare     │  ← SSL 종료, DDoS 보호
│  Edge Network   │
└────────┬────────┘
         │ Cloudflare Tunnel (아웃바운드 연결)
         ▼
┌─────────────────┐
│  cloudflared    │  ← 서버에서 Cloudflare로 터널 연결
│  (로컬 데몬)     │     인바운드 포트 불필요
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nginx:3111     │  ← 리버스 프록시
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next.js:3112   │  ← 웹 애플리케이션
└─────────────────┘
```

---

**작성일**: 2025년 12월 23일
**작성자**: Claude Code
**관련 문서**: [서버_아키텍처_및_도메인_연결.md](./서버_아키텍처_및_도메인_연결.md)
