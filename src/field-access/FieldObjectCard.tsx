import qr01 from '../../artifacts/field-batch-001/LD-01-CTNZL8.svg'
import qr02 from '../../artifacts/field-batch-001/LD-02-W9JK4J.svg'
import qr03 from '../../artifacts/field-batch-001/LD-03-NRDND8.svg'
import qr04 from '../../artifacts/field-batch-001/LD-04-7PGQZM.svg'
import qr05 from '../../artifacts/field-batch-001/LD-05-JEJCFM.svg'
import qr06 from '../../artifacts/field-batch-001/LD-06-44ZSSL.svg'
import qr07 from '../../artifacts/field-batch-001/LD-07-J49AQW.svg'
import qr08 from '../../artifacts/field-batch-001/LD-08-JWB639.svg'
import qr09 from '../../artifacts/field-batch-001/LD-09-STS68S.svg'
import qr10 from '../../artifacts/field-batch-001/LD-10-DJ39LF.svg'
import { getFieldAccessConfig } from './fieldAccessConfig'

interface FieldObjectCardProps {
  edition: string
  token: string
  compact?: boolean
  entering?: boolean
}

const qrByEdition: Record<string, string> = {
  '01': qr01,
  '02': qr02,
  '03': qr03,
  '04': qr04,
  '05': qr05,
  '06': qr06,
  '07': qr07,
  '08': qr08,
  '09': qr09,
  '10': qr10,
}

export function FieldObjectCard({
  edition,
  token,
  compact = false,
  entering = false,
}: FieldObjectCardProps) {
  const normalizedEdition = edition.padStart(2, '0')
  const config = getFieldAccessConfig(normalizedEdition)
  const objectName = config?.objectName ?? 'Field Object'

  return (
    <article
      className={[
        'field-object-card',
        compact ? 'field-object-card--compact' : '',
        entering ? 'field-object-card--entering' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Lab Dojo ${objectName}, edition ${normalizedEdition}, serial ${token}`}
    >
      <div className="field-object-card__canvas">
        <div className={`field-card field-card--${normalizedEdition}`}>
          <EditionArtwork edition={normalizedEdition} token={token} />
          <Qr edition={normalizedEdition} />
        </div>
      </div>
    </article>
  )
}

function EditionArtwork({ edition, token }: { edition: string; token: string }) {
  switch (edition) {
    case '01':
      return (
        <>
          <span className="field-card__rail field-card__rail--entrance" />
          <span className="field-card__rule field-card__rule--e01" />
          <Text className="field-card__technical field-card__e01-category">LD–FIELD / PUBLIC ACCESS</Text>
          <Text className="field-card__index field-card__e01-index">01 / 10 FOUND</Text>
          <Text className="field-card__title field-card__e01-title">YOU FOUND A<br />LAB ENTRANCE</Text>
          <Text className="field-card__body field-card__e01-body">A tiny machine is waiting inside.<br />It does one strange, useful thing.</Text>
          <Text className="field-card__output field-card__e01-action">OPEN THE ARCHIVE</Text>
          <Text className="field-card__token field-card__e01-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__e01-footer">LAB DOJO / TEN PUBLIC ENTRY POINTS</Text>
          <LabDojoSign live />
          <LiveDot className="field-card__e01-live" />
        </>
      )
    case '02':
      return (
        <>
          <span className="field-card__live-bar field-card__e02-live-bar" />
          <Text className="field-card__technical field-card__inverse field-card__e02-category">LD–TEST / LIVE PUBLIC PROTOCOL</Text>
          <Text className="field-card__title field-card__inverse field-card__e02-title">NOW<br />TESTING</Text>
          <Text className="field-card__body field-card__inverse field-card__e02-body">One unfinished experiment is live.<br />Curiosity is enough to enter.</Text>
          <Text className="field-card__output field-card__inverse field-card__e02-action">VIEW THE LIVE TEST</Text>
          <Text className="field-card__token field-card__inverse field-card__e02-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__inverse field-card__e02-footer">02 / 10 / @LABDOJO</Text>
          <LabDojoSign inverse live />
        </>
      )
    case '03':
      return (
        <>
          <Text className="field-card__technical field-card__e03-category">LD–OBSERVATION / MACHINE STATE</Text>
          <Text className="field-card__display field-card__muted field-card__e03-index">03</Text>
          <Text className="field-card__title-compact field-card__e03-title">A SMALL<br />MACHINE<br />IS AWAKE</Text>
          <Text className="field-card__body field-card__e03-body">It has been waiting for input.<br />Curiosity wakes it.</Text>
          <span className="field-card__vertical-rule field-card__e03-rule" />
          <LiveDot className="field-card__e03-live" />
          <Text className="field-card__output field-card__e03-action">WAKE MACHINE 03</Text>
          <Text className="field-card__token field-card__e03-token">FIELD OBJECT / {token}</Text>
          <LabDojoSign live />
        </>
      )
    case '04':
      return (
        <>
          <span className="field-card__subject-field" />
          <Text className="field-card__technical field-card__inverse field-card__e04-help">HELP WANTED</Text>
          <Text className="field-card__subject-title field-card__inverse field-card__e04-title">HUMAN<br />SUBJECT<br />NEEDED</Text>
          <Text className="field-card__index field-card__inverse field-card__e04-code">HUM–04</Text>
          <Text className="field-card__technical field-card__e04-category">LD–PUBLIC /<br />OPEN CALL</Text>
          <Text className="field-card__body field-card__e04-body">Curiosity is the only<br />qualification.</Text>
          <Text className="field-card__output field-card__e04-checklist">□ CURIOUS<br />□ RESTLESS<br />■ QUALIFIED</Text>
          <Text className="field-card__output field-card__e04-action">BECOME SUBJECT 04</Text>
          <Text className="field-card__token field-card__e04-token">FIELD OBJECT / {token}</Text>
          <LiveDot className="field-card__e04-live" />
        </>
      )
    case '05':
      return (
        <>
          <Text className="field-card__technical field-card__e05-category">LD–ARCHIVE / ACCESSION CARD</Text>
          <Text className="field-card__index field-card__e05-index">05 / A–01</Text>
          <span className="field-card__rule field-card__rule--e05-header" />
          <Text className="field-card__title field-card__e05-title">SPECIMEN<br />ACCESS / 05</Text>
          <span className="field-card__record-rule field-card__record-rule--1" />
          <span className="field-card__record-rule field-card__record-rule--2" />
          <span className="field-card__record-rule field-card__record-rule--3" />
          <Text className="field-card__output field-card__e05-record">CLASS&nbsp;&nbsp;&nbsp;PUBLIC<br />STATE&nbsp;&nbsp;&nbsp;UNFINISHED<br />ACCESS&nbsp;&nbsp;GRANTED</Text>
          <Text className="field-card__output field-card__e05-action">OPEN SPECIMEN 05</Text>
          <Text className="field-card__token field-card__e05-token">FIELD OBJECT / {token}</Text>
          <span className="field-card__footer-field" />
          <Text className="field-card__technical-small field-card__inverse field-card__e05-footer">05 / 10 / KEEP AS EVIDENCE</Text>
          <LiveDot className="field-card__e05-live" />
        </>
      )
    case '06':
      return (
        <>
          <Text className="field-card__technical field-card__e06-category">LD–NOTE / ADMISSION CONDITION</Text>
          <LiveDot className="field-card__e06-live" large />
          <Text className="field-card__title field-card__e06-title">CURIOSITY<br />SUFFICIENT</Text>
          <Text className="field-card__body field-card__e06-body">You already meet the condition.<br />Admission condition met.</Text>
          <Text className="field-card__output field-card__e06-action">CLAIM FIELD ACCESS</Text>
          <Text className="field-card__token field-card__e06-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__e06-footer">06 / 10 / ACCESS</Text>
          <LabDojoSign />
        </>
      )
    case '07':
      return (
        <>
          <span className="field-card__recovered-field" />
          <Text className="field-card__technical field-card__e07-category">LD–RECOVERED</Text>
          <Text className="field-card__display field-card__e07-index">07</Text>
          <Text className="field-card__index field-card__e07-state">CONDITION / STABLE</Text>
          <Text className="field-card__section field-card__e07-title">DO NOT<br />DISCARD</Text>
          <Text className="field-card__body field-card__e07-body">Part 07 of 10.<br />The others are in<br />the archive.</Text>
          <Text className="field-card__token field-card__e07-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__output field-card__e07-action">FIND THE OTHER 09</Text>
          <span className="field-card__footer-field" />
          <Text className="field-card__technical-small field-card__inverse field-card__e07-footer">ARCHIVE 07 / KEEP THIS CARD</Text>
          <LiveDot className="field-card__e07-live" />
        </>
      )
    case '08':
      return (
        <>
          <Text className="field-card__technical field-card__e08-category">LD–MACHINE / OPERATING INSTRUCTION</Text>
          <LiveDot className="field-card__e08-live" />
          <span className="field-card__instruction-field" />
          <Text className="field-card__title-compact field-card__inverse field-card__e08-title">INSERT CURIOSITY<br />REMOVE ASSUMPTIONS</Text>
          <Text className="field-card__body field-card__e08-body">One input. One small machine.<br />See what it produces.</Text>
          <Text className="field-card__output field-card__e08-action">RUN THE PROCEDURE</Text>
          <Text className="field-card__token field-card__e08-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__e08-footer">08 / 10 / OUTPUT INSIDE</Text>
        </>
      )
    case '09':
      return (
        <>
          <Text className="field-card__technical field-card__e09-category">LD–FIELD NOTE / OBSERVATION 009</Text>
          <span className="field-card__rule field-card__rule--e09-header" />
          <span className="field-card__vertical-rule field-card__e09-rule" />
          <Text className="field-card__output field-card__e09-metadata">SITE&nbsp;&nbsp;&nbsp;PUBLIC<br />TIME&nbsp;&nbsp;&nbsp;UNKNOWN<br />STATE&nbsp;&nbsp;OPEN<br />CLASS&nbsp;&nbsp;SOFT</Text>
          <Text className="field-card__section field-card__e09-title">OBSERVATION</Text>
          <Text className="field-card__body field-card__e09-body">The observation continues inside.<br />Your attention completes it.</Text>
          <Text className="field-card__output field-card__e09-action">COMPLETE NOTE 09</Text>
          <Text className="field-card__token field-card__e09-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__e09-footer">09 / 10 / WITNESS REQUIRED</Text>
          <LabDojoSign muted />
        </>
      )
    case '10':
      return (
        <>
          <Text className="field-card__technical field-card__inverse field-card__e10-category">LD–SPECIMEN ROOM / NOTICE 010</Text>
          <span className="field-card__live-bar field-card__e10-live-bar" />
          <Text className="field-card__title-compact field-card__inverse field-card__e10-title">PLEASE DO NOT<br />DISTURB THE<br />SPECIMENS</Text>
          <Text className="field-card__body field-card__inverse field-card__e10-body">One specimen is still awake.<br />Observation is permitted.</Text>
          <Text className="field-card__output field-card__inverse field-card__e10-action">ENTER ROOM 10</Text>
          <Text className="field-card__token field-card__inverse field-card__e10-token">FIELD OBJECT / {token}</Text>
          <Text className="field-card__technical-small field-card__inverse field-card__e10-footer">10 / 10 / LAST SPECIMEN</Text>
          <LabDojoSign inverse live />
        </>
      )
    default:
      return (
        <>
          <Text className="field-card__technical field-card__fallback-category">LD–FIELD / UNRESOLVED OBJECT</Text>
          <Text className="field-card__title field-card__fallback-title">FIELD OBJECT<br />{edition}</Text>
          <Text className="field-card__token field-card__fallback-token">FIELD OBJECT / {token}</Text>
        </>
      )
  }
}

function Qr({ edition }: { edition: string }) {
  const src = qrByEdition[edition]
  if (!src) return null

  return (
    <div className={`field-card__qr field-card__qr--${edition}`} aria-hidden="true">
      <img src={src} alt="" draggable={false} />
    </div>
  )
}

function Text({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`field-card__text ${className}`}>{children}</span>
}

function LiveDot({ className, large = false }: { className: string; large?: boolean }) {
  return <span className={`field-card__live-dot ${large ? 'field-card__live-dot--large' : ''} ${className}`} aria-hidden="true" />
}

function LabDojoSign({
  inverse = false,
  muted = false,
  live = false,
}: {
  inverse?: boolean
  muted?: boolean
  live?: boolean
}) {
  return (
    <span
      className={[
        'field-card__sign',
        inverse ? 'field-card__sign--inverse' : '',
        muted ? 'field-card__sign--muted' : '',
        live ? 'field-card__sign--live' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <i />
      <b><i /><i /><i /></b>
      {live && <em />}
    </span>
  )
}
