import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// Next.js 16 은 `next build` 에서 lint 를 실행하지 않는다. `npm run lint` 가 유일한 게이트다.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**", "supabase/**"]),
  {
    // shadcn/ui 에서 그대로 가져온 코드. React Compiler 규칙(set-state-in-effect, purity)이
    // 상류 구현 패턴을 지적한다. 상류와 다르게 고치면 업데이트 때 다시 갈라지므로
    // 이 세 파일에서만 경고로 낮춘다. 우리가 작성한 코드에는 그대로 오류다.
    files: ["components/ui/carousel.tsx", "components/ui/sidebar.tsx", "components/ui/use-mobile.tsx", "hooks/use-mobile.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
])
