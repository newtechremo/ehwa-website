"use client"

import { useState, useEffect, useCallback } from "react"

type FontScale = 100 | 125 | 150

interface AccessibilityState {
  lowVision: boolean
  signLanguage: boolean
  fontScale: FontScale
}

export function useAccessibility() {
  const [state, setState] = useState<AccessibilityState>({
    lowVision: false,
    signLanguage: false,
    fontScale: 100,
  })

  // 고대비 모드 토글
  const toggleLowVision = useCallback(() => {
    setState((prev) => {
      const newLowVision = !prev.lowVision
      return {
        ...prev,
        lowVision: newLowVision,
        // 고대비 모드 활성화 시 글자 크기 기본값으로
        fontScale: newLowVision ? 100 : prev.fontScale,
      }
    })
  }, [])

  // 수어 영상 토글
  const toggleSignLanguage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      signLanguage: !prev.signLanguage,
    }))
  }, [])

  // 글자 크기 변경
  const changeFontSize = useCallback(
    (direction: 1 | -1) => {
      if (state.lowVision) {
        // 고대비 모드에서는 글자 크기 변경 불가
        return
      }

      const scales: FontScale[] = [100, 125, 150]
      const currentIndex = scales.indexOf(state.fontScale)
      const newIndex = Math.max(0, Math.min(2, currentIndex + direction))

      setState((prev) => ({
        ...prev,
        fontScale: scales[newIndex],
      }))
    },
    [state.lowVision, state.fontScale],
  )

  // body 클래스 및 폰트 크기 적용
  useEffect(() => {
    if (state.lowVision) {
      document.body.classList.add("low-vision")
    } else {
      document.body.classList.remove("low-vision")
    }

    document.documentElement.style.fontSize = `${state.fontScale}%`
  }, [state.lowVision, state.fontScale])

  return {
    lowVision: state.lowVision,
    signLanguage: state.signLanguage,
    fontScale: state.fontScale,
    toggleLowVision,
    toggleSignLanguage,
    changeFontSize,
  }
}
