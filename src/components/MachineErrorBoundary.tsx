import { Component, type ErrorInfo, type ReactNode } from 'react'
import {
  createDiagnosticEvent,
  logDevelopmentDiagnostic,
  type DiagnosticCode,
} from '../diagnostics'

interface MachineErrorBoundaryProps {
  children: ReactNode
  code?: DiagnosticCode
}

interface MachineErrorBoundaryState {
  failed: boolean
}

export class MachineErrorBoundary extends Component<
  MachineErrorBoundaryProps,
  MachineErrorBoundaryState
> {
  state: MachineErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): MachineErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    logDevelopmentDiagnostic(createDiagnosticEvent(
      this.props.code ?? 'APP_RENDER_FAILED',
      'app',
    ))
  }

  private retry = () => {
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="machine-fallback" role="alert">
        <span>REGISTER RECOVERY MODE</span>
        <h1>The machine lost its place.</h1>
        <p>Your locally saved draft has not been intentionally cleared.</p>
        <button type="button" onClick={this.retry}>TRY THE REGISTER AGAIN</button>
        <button type="button" onClick={() => window.location.reload()}>RELOAD MACHINE</button>
      </main>
    )
  }
}
