export function isolateModalBackground(modalRoot: HTMLElement): () => void {
  const { body, documentElement, defaultView } = modalRoot.ownerDocument
  const background = Array.from(body.children).filter(
    (element): element is HTMLElement =>
      "inert" in element && element !== modalRoot && !element.contains(modalRoot),
  )
  const inertStates = background.map((element) => [element, element.inert] as const)
  const bodyOverflow = body.style.overflow
  const bodyPosition = body.style.position
  const bodyTop = body.style.top
  const bodyWidth = body.style.width
  const documentOverflow = documentElement.style.overflow
  const documentScrollBehavior = documentElement.style.scrollBehavior
  const scrollY = defaultView?.scrollY ?? 0

  background.forEach((element) => { element.inert = true })
  body.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.top = `-${scrollY}px`
  body.style.width = "100%"
  documentElement.style.overflow = "hidden"

  return () => {
    inertStates.forEach(([element, inert]) => { element.inert = inert })
    body.style.overflow = bodyOverflow
    body.style.position = bodyPosition
    body.style.top = bodyTop
    body.style.width = bodyWidth
    documentElement.style.overflow = documentOverflow
    documentElement.style.scrollBehavior = "auto"
    defaultView?.scrollTo(0, scrollY)
    documentElement.style.scrollBehavior = documentScrollBehavior
  }
}
