<div align="center">

# k-saju

**사주, 추측이 아니라 계산으로.**

분 단위 절기 경계 · 진태양시(경도+균시차) · 해외 출생 타임존까지 처리하는
결정론 TypeScript 사주 엔진 — 채택한 학파 규칙을 전부 문서와 테스트로 공개합니다.

[![ci](https://github.com/bunhine0452/k-saju/actions/workflows/ci.yml/badge.svg)](https://github.com/bunhine0452/k-saju/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/k-saju.svg)](https://www.npmjs.com/package/k-saju)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

```bash
npx k-saju 1995-03-16 07:30
```

*[English README](./README.md)*

</div>

---

만세력의 계산 부분만 코드로 옮긴 라이브러리입니다. 사주 4기둥(년·월·일·시주),
오행 분포(지장간 월률분야 가중), 십성, 십이운성, 대운을 **결정론적으로** 계산합니다.
해석(풀이)은 하지 않습니다 — 그건 언어의 일이고, 이 엔진은 숫자의 일만 합니다.

[ioreum](https://www.ioreum.com) 프로덕션 엔진에서 추출해 공개한 코드로,
"계산은 코드, 해석은 AI" 원칙의 계산 절반입니다.

## 왜 만들었나 — 계산기들이 틀리는 4가지 경계

| 함정 | 흔한 구현 | k-saju | 직접 확인 |
| --- | --- | --- | --- |
| 절기는 '날짜'가 아니라 '시각' (입춘 2024 = 2/4 05:02 KST) | 일 단위 적용 → 그날 아침 출생자의 년주가 틀림 | 분 단위 비교로 년주·월주 교정 | `npx k-saju 2024-02-04 04:00` → 년주 癸卯 유지 |
| 야자시(23:30~) — 일주와 시간(時干)의 분리 | 일주까지 넘기거나, 규칙 무시 | 일주는 자정 기준 유지, 시간만 익일 일간 | `npx k-saju 2000-05-15 23:31` → 일주 癸酉 · 시주 甲子 |
| 시계 ≠ 태양 (표준자오선 135°E vs 서울 127°) | 일괄 −30분 또는 무보정 | 경도×4분 + 균시차(날짜별) 선택 적용 | `npx k-saju 2000-05-05 09:30 --lon 124.7` → 丙辰 (서울은 丁巳) |
| 해외 출생 — 절기는 절대 시각 | 현지 '날짜'와 KST 절기 '날짜' 비교 | 절기 시각을 현지시로 환산해 시점끼리 비교 | `npx k-saju 2024-02-03 16:00 --place new-york` → 년주 甲辰 |

표의 모든 값은 골든 테스트로 잠겨 있어, 코드와 어긋나는 순간 CI가 실패합니다.

## 설치·사용

```bash
npm install k-saju     # 라이브러리
npx k-saju             # CLI (인자 없이 실행하면 대화형)
```

```ts
import { deriveSaju, analyzeElements, analyzeDaeun, iljuInfo } from 'k-saju';

const birth = { date: '1995-03-16', time: '07:30', calendar: 'solar' } as const;
const saju = deriveSaju(birth);       // 4기둥 + 보정 플래그(절기/진태양시)
const oheng = analyzeElements(saju);  // counts(본기) + weighted(지장간 가중)
const daeun = analyzeDaeun(birth, saju, 'M'); // 대운 — daysToTerm 공개(검산 가능)
iljuInfo(saju);                       // 일주론: 십이운성 + 일지 십성
```

음력·윤달(`calendar: 'lunar'`, `isLeapMonth`), 해외 출생(`tzOffsetMin`, `longitude`) 지원.
ESM 전용, Node ≥ 20, 타입 내장, 런타임 의존성 1개
([@fullstackfamily/manseryeok](https://www.npmjs.com/package/@fullstackfamily/manseryeok), MIT · KASI 기반 1900~2050).

## 정직한 한계

- 분 단위 절기 시각 데이터는 **2020~2030** — 그 외 연도는 일 단위 폴백(로드맵 1순위: 천문 계산으로 전 구간 확장, help wanted).
- 대운수는 절입 일 단위(정오 샘플링) 계산이라 종이 만세력과 ±1년 차이 가능 — 근거인 `daysToTerm`을 그대로 반환.
- 균시차는 표준 근사식(±0.5분).
- 채택 학파: 야자시=시간만 익일 · 해외출생=현지시 기준 · 대운 방향=년간 음양×성별. 다른 학파면 코드가 짧으니 fork해서 규칙을 바꾸세요.

## 라이선스

MIT. 만세력 데이터셋은 @fullstackfamily/manseryeok(MIT).
새벽 2시에 절기 경계 수식을 다시 유도하는 일을 이 저장소가 대신해 줬다면, ⭐ 하나가 다음 사람을 구합니다.
