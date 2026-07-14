export function MachineSettingsSheet({
  soundEnabled,
  hapticsEnabled,
  onSoundChange,
  onHapticsChange,
}: {
  soundEnabled: boolean
  hapticsEnabled: boolean
  onSoundChange: (enabled: boolean) => void
  onHapticsChange: (enabled: boolean) => void
}) {
  return (
    <div className="sheet-settings-list">
      <label>
        <span>
          <strong>TINY PRINTER SOUND</strong>
          <small>Mechanical feedback without becoming a whole situation.</small>
        </span>
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(event) => onSoundChange(event.target.checked)}
        />
      </label>
      <label>
        <span>
          <strong>HAPTIC TAPS</strong>
          <small>Uses device vibration only where the browser permits it.</small>
        </span>
        <input
          type="checkbox"
          checked={hapticsEnabled}
          onChange={(event) => onHapticsChange(event.target.checked)}
        />
      </label>
      <p>Nothing selected in this machine is uploaded. Preferences stay in this browser.</p>
    </div>
  )
}
