export const SOFT_MACHINE_BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1099,
  desktopMin: 1100,
} as const

export const SOFT_MACHINE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const
