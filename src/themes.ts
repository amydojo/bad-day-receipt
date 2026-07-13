import type { ReceiptItem } from './types'

export type ReceiptThemeId = 'original' | 'cvs' | 'government' | 'luxury' | 'victorian'

export interface ReceiptTheme {
  id: ReceiptThemeId
  name: string
  shortName: string
  description: string
  eyebrow: string
  title: string
  department: string
  servedBy: string
  taxLabel: string
  creditLabel: string
  totalLabel: string
  mark: string
  emptyState: [string, string]
  notes: [string, string, string]
  couponLines?: string[]
  palette: {
    paper: string
    ink: string
    accent: string
  }
  titleFont: string
  bodyFont: string
  itemLabelOverrides?: Record<string, string>
  statusLabels: Record<string, string>
}

const defaultStatuses = {
  'weird little day': 'weird little day',
  'dented but operational': 'dented but operational',
  survivable: 'survivable',
  'system under load': 'system under load',
  'please be extremely gentle': 'please be extremely gentle',
}

export const themes: ReceiptTheme[] = [
  {
    id: 'original',
    name: 'Original Thermal',
    shortName: 'Original',
    description: 'The emotionally accurate classic.',
    eyebrow: 'THE HUMAN CONDITION',
    title: 'BAD DAY RECEIPT',
    department: 'RETURNS DEPARTMENT',
    servedBy: 'SERVED BY: NERVOUS SYSTEM',
    taxLabel: 'EMOTIONAL TAX 8.5%',
    creditLabel: 'CARE CREDITS',
    totalLabel: 'TOTAL DAMAGE',
    mark: 'BD',
    emptyState: ['NO DAMAGE RECORDED', 'SUSPICIOUS, BUT BEAUTIFUL'],
    notes: ['RETURN POLICY: NONE.', 'TOMORROW IS A FRESH TRANSACTION.', 'THANK YOU FOR TRYING ANYWAY.'],
    palette: { paper: '#f4efd9', ink: '#171713', accent: '#d73b2f' },
    titleFont: '900 54px ui-monospace, SFMono-Regular, Menlo, monospace',
    bodyFont: '19px ui-monospace, SFMono-Regular, Menlo, monospace',
    statusLabels: defaultStatuses,
  },
  {
    id: 'cvs',
    name: 'CVS Catastrophe',
    shortName: 'CVS',
    description: 'A pharmacy-length record of every psychic expense.',
    eyebrow: 'UNOFFICIAL EXTRACARE FOR THE SOUL',
    title: 'CVS CATASTROPHE',
    department: 'EMOTIONAL PHARMACY · OPEN TOO LATE',
    servedBy: 'CASHIER: YOUR LAST FUNCTIONING NERVE',
    taxLabel: 'PHARMACY AISLE SURCHARGE 8.5%',
    creditLabel: 'EXTRACARE CREDITS',
    totalLabel: 'TODAY YOU PAID',
    mark: '+',
    emptyState: ['NO CATASTROPHE SCANNED', 'PLEASE CHECK UNDER THE CART'],
    notes: ['ALL SALES FINAL.', 'COUPONS MAY NOT BE COMBINED WITH DIGNITY.', 'THANK YOU FOR SHOPPING WHILE SENTIENT.'],
    couponLines: [
      'YOU SAVED: YOUR LAST NERVE',
      '40% OFF ONE FUTURE OBLIGATION',
      '$2 EXTRABUCKS TOWARD DOING ABSOLUTELY NOTHING',
      'BONUS OFFER: DRINK WATER BEFORE THE COUPON EXPIRES',
    ],
    palette: { paper: '#fffdf8', ink: '#101010', accent: '#cc1f2f' },
    titleFont: '900 48px Arial, Helvetica, sans-serif',
    bodyFont: '18px Arial, Helvetica, sans-serif',
    itemLabelOverrides: {
      normal: 'ACTING NORMAL VALUE PACK',
      worry: 'UNNECESSARY WORRY 1CT',
      phone: 'SURPRISE PHONE CALL',
      decisions: 'TINY DECISIONS MULTIPACK',
      public: 'PUBLIC EXISTENCE FEE',
      email: 'EMAIL OPENING SERVICE',
      perceived: 'BEING PERCEIVED 24HR',
      battery: 'SOCIAL BATTERY OVERDRAFT',
      dread: 'VAGUE DREAD XL',
      food: 'EXTRACARE: ATE SOMETHING',
      answered: 'EXTRACARE: ANSWERED ANYWAY',
      beautiful: 'EXTRACARE: TINY BEAUTIFUL MOMENT',
      through: 'EXTRACARE: MADE IT THROUGH',
    },
    statusLabels: {
      'weird little day': 'receipt within normal weirdness',
      'dented but operational': 'minor aisle incident',
      survivable: 'extracare eligible',
      'system under load': 'pharmacist consultation suggested',
      'please be extremely gentle': 'manager called to emotional register',
    },
  },
  {
    id: 'government',
    name: 'Government Breakdown',
    shortName: 'Form BD-17',
    description: 'Your distress has been received and is under review.',
    eyebrow: 'DEPARTMENT OF INTERNAL WEATHER',
    title: 'FORM BD-17',
    department: 'CERTIFICATE OF EMOTIONAL EXPENDITURE',
    servedBy: 'PROCESSING OFFICER: AUTONOMIC SYSTEM',
    taxLabel: 'ADMINISTRATIVE DISTRESS LEVY 8.5%',
    creditLabel: 'APPROVED MITIGATIONS',
    totalLabel: 'DECLARED BURDEN',
    mark: '17',
    emptyState: ['NO INCIDENTS DECLARED', 'FILING REMAINS OPTIONAL'],
    notes: ['CLAIM STATUS: RECEIVED.', 'ESTIMATED REVIEW PERIOD: INDEFINITE.', 'KEEP THIS FORM FOR YOUR RECORDS.'],
    palette: { paper: '#e9edf0', ink: '#15232d', accent: '#b22d2d' },
    titleFont: '900 50px ui-monospace, SFMono-Regular, Menlo, monospace',
    bodyFont: '18px ui-monospace, SFMono-Regular, Menlo, monospace',
    itemLabelOverrides: {
      normal: 'PUBLIC COMPOSURE REQUIREMENT',
      worry: 'UNAUTHORIZED WORRY EVENT',
      phone: 'UNSCHEDULED TELEPHONE CONTACT',
      decisions: 'DECISION BURDEN ASSESSMENT',
      public: 'CIVILIAN VISIBILITY EXPOSURE',
      labor: 'UNCOMPENSATED EMOTIONAL LABOR',
      food: 'MITIGATION: NUTRITION ATTEMPT',
      help: 'MITIGATION: SUPPORT REQUESTED',
      rested: 'MITIGATION: REST PERIOD',
      through: 'MITIGATION: DAY COMPLETED',
    },
    statusLabels: {
      'weird little day': 'no further action required',
      'dented but operational': 'claim accepted with minor damages',
      survivable: 'distress declared',
      'system under load': 'priority review authorized',
      'please be extremely gentle': 'emergency gentleness provision active',
    },
  },
  {
    id: 'luxury',
    name: 'Luxury Emotional Invoice',
    shortName: 'Luxury',
    description: 'Bespoke suffering, privately invoiced.',
    eyebrow: 'PRIVATE CLIENT SERVICES',
    title: 'EMOTIONAL INVOICE',
    department: 'DISCREET SERVICES RENDERED',
    servedBy: 'CLIENT ADVISOR: THE INNER SELF',
    taxLabel: 'CONCIERGE DREAD 8.5%',
    creditLabel: 'COURTESIES EXTENDED',
    totalLabel: 'BALANCE OF EXPERIENCE',
    mark: 'É',
    emptyState: ['NO SERVICES RENDERED', 'A RARE AND EXQUISITE CONDITION'],
    notes: ['PAYMENT ACCEPTED IN REST.', 'GRATUITY HAS BEEN EMOTIONALLY INCLUDED.', 'WITH OUR WARMEST REGRETS.'],
    palette: { paper: '#f8f2e7', ink: '#1b1712', accent: '#9a7440' },
    titleFont: '400 60px Georgia, Times New Roman, serif',
    bodyFont: '19px Georgia, Times New Roman, serif',
    itemLabelOverrides: {
      normal: 'Public composure, bespoke',
      worry: 'Private worry consultation',
      phone: 'Unexpected correspondence',
      decisions: 'Curated decision fatigue',
      public: 'Public appearance engagement',
      perceived: 'Personal visibility service',
      labor: 'Invisible care, premium tier',
      dread: 'Extended atmospheric dread',
      food: 'Courtesy: nourishment',
      beautiful: 'Courtesy: beautiful interval',
      rested: 'Courtesy: unearned repose',
      through: 'Courtesy: continued existence',
    },
    statusLabels: {
      'weird little day': 'a modest private inconvenience',
      'dented but operational': 'gently weathered',
      survivable: 'handled with discretion',
      'system under load': 'concierge care recommended',
      'please be extremely gentle': 'white-glove gentleness required',
    },
  },
  {
    id: 'victorian',
    name: 'Victorian Pharmacy',
    shortName: 'Apothecary',
    description: 'Prescribed silence, broth, and freedom from obligations.',
    eyebrow: 'DOJO & CO. APOTHECARIES',
    title: 'A BILL OF REMEDIES',
    department: 'FOR NERVOUS CONDITIONS & MODERN EXHAUSTION',
    servedBy: 'DISPENSED BY: THE HOUSE PHYSICIAN',
    taxLabel: 'MELANCHOLY DUTY 8.5%',
    creditLabel: 'RESTORATIVE TONICS',
    totalLabel: 'SUM OF AFFLICTION',
    mark: 'Rx',
    emptyState: ['NO AILMENT OBSERVED', 'THE PATIENT APPEARS MIRACULOUS'],
    notes: ['PRESCRIBED: SILENCE AND BROTH.', 'NOT TO BE TAKEN WITH OBLIGATIONS.', 'RETURN UPON THE MORROW IF STILL HAUNTED.'],
    palette: { paper: '#eadfca', ink: '#2e251c', accent: '#6f2d2b' },
    titleFont: '700 54px Georgia, Times New Roman, serif',
    bodyFont: '19px Georgia, Times New Roman, serif',
    itemLabelOverrides: {
      normal: 'Draught of Public Composure',
      worry: 'One Unnecessary Worry',
      phone: 'Sudden Telephone Agitation',
      decisions: 'Powdered Decision Fatigue',
      public: 'Exposure to the Public',
      'hard-mode': 'Ordinary Task, Severe Variety',
      dread: 'Prolonged Vapours of Dread',
      food: 'Tonic: A Small Repast',
      outside: 'Tonic: Fresh Air',
      beautiful: 'Tonic: A Beautiful Trifle',
      through: 'Tonic: Survival of the Day',
    },
    statusLabels: {
      'weird little day': 'constitution mildly peculiar',
      'dented but operational': 'nerves somewhat agitated',
      survivable: 'the patient shall endure',
      'system under load': 'bed rest strongly advised',
      'please be extremely gentle': 'delicate constitution: do not disturb',
    },
  },
]

export function getTheme(id: ReceiptThemeId): ReceiptTheme {
  return themes.find((theme) => theme.id === id) ?? themes[0]
}

export function getThemeItemLabel(item: ReceiptItem, theme: ReceiptTheme): string {
  return theme.itemLabelOverrides?.[item.id] ?? item.label
}

export function getThemeStatus(status: string, theme: ReceiptTheme): string {
  return theme.statusLabels[status] ?? status
}
