import * as React from "react"

const MOBILE_BREAKPOINT = 768

function getMediaQuery() {
  return `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(getMediaQuery())
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(getMediaQuery()).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
