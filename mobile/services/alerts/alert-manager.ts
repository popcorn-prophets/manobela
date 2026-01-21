import { MetricsOutput } from '@/types/metrics';
import { AlertConfig, AlertPriority, AlertState } from '@/types/alerts';
import { ALERT_CONFIGS } from './alert-config';
import { evaluateAlertConditions } from './alert-evaluator';
import { speak, stopSpeaking } from '../speech';
import { triggerHaptic } from '../hapticts';

export const DEFAULT_STARTUP_DELAY_MS = 4_000;

/**
 * Manages audio alerts for driver monitoring metrics.
 *
 * Responsibilities:
 * - Play a one-time welcome message at session start
 * - Enforce a startup grace period before alerts begin
 * - Orchestrate alert selection
 * - Coordinate alert playback and interruption
 */
export class AlertManager {
  private alertStates = new Map<string, AlertState>();
  private currentAlert: AlertConfig | null = null;

  // Session / startup state
  private sessionStartedAt: number | null = null;
  private hasPlayedWelcome = false;
  private readonly startupDelayMs = DEFAULT_STARTUP_DELAY_MS;

  /**
   * Process new metrics and trigger alerts if conditions are met.
   * Safe to call on every inference update.
   */
  processMetrics(metrics: MetricsOutput | null): void {
    if (!metrics) return;

    const now = Date.now();

    // Enforce startup grace period
    if (!this.sessionStartedAt || now - this.sessionStartedAt < this.startupDelayMs) {
      return;
    }

    const triggeredAlerts = evaluateAlertConditions(metrics, ALERT_CONFIGS);
    const alertToTrigger = this.selectAlert(triggeredAlerts);

    if (alertToTrigger) {
      this.triggerAlert(alertToTrigger);
    }
  }

  /**
   * Play a one-time welcome message at session start.
   */
  private playWelcomeMessage(): void {
    if (this.hasPlayedWelcome) return;

    this.hasPlayedWelcome = true;

    speak('Driver monitoring active. Drive safely.');
  }

  /**
   * Select the highest priority alert that is not in cooldown.
   * Higher-priority alerts may interrupt lower-priority ones.
   */
  private selectAlert(triggered: AlertConfig[]): AlertConfig | null {
    if (triggered.length === 0) return null;

    const sorted = [...triggered].sort((a, b) => b.priority - a.priority);
    const now = Date.now();

    for (const config of sorted) {
      const state = this.getAlertState(config.id);

      // Cooldown check
      if (now - state.lastTriggeredAt < config.cooldownMs) {
        continue;
      }

      // Priority interruption check
      if (this.currentAlert && config.priority <= this.currentAlert.priority) {
        continue;
      }

      return config;
    }

    return null;
  }

  /**
   * Trigger an alert.
   */
  private async triggerAlert(config: AlertConfig): Promise<void> {
    const state = this.getAlertState(config.id);

    // Interrupt lower-priority alert if needed
    if (this.currentAlert && config.priority > this.currentAlert.priority) {
      await stopSpeaking();
    }

    // Avoid re-speaking the same alert concurrently
    if (state.isSpeaking) return;

    state.lastTriggeredAt = Date.now();
    state.isSpeaking = true;
    this.currentAlert = config;

    if (config.priority === AlertPriority.CRITICAL || config.priority === AlertPriority.HIGH) {
      triggerHaptic({ type: 'warning' });
    } else {
      triggerHaptic({ type: 'impact' });
    }

    speak(config.message, {
      onDone: () => this.clearAlertState(config, state),
      onStopped: () => this.clearAlertState(config, state),
      onError: () => this.clearAlertState(config, state),
    });
  }

  /**
   * Clear alert state after speech completion.
   */
  private clearAlertState(config: AlertConfig, state: AlertState): void {
    state.isSpeaking = false;

    if (this.currentAlert?.id === config.id) {
      this.currentAlert = null;
    }
  }

  /**
   * Get or initialize alert state.
   */
  private getAlertState(alertId: string): AlertState {
    let state = this.alertStates.get(alertId);

    if (!state) {
      state = { lastTriggeredAt: 0, isSpeaking: false };
      this.alertStates.set(alertId, state);
    }

    return state;
  }

  /**
   * Start session and play welcome message.
   */
  start() {
    this.currentAlert = null;
    this.sessionStartedAt = Date.now();
    this.playWelcomeMessage();
  }

  /**
   * Stop all alerts and reset session state.
   * Safe to call multiple times.
   */
  async stop(): Promise<void> {
    await stopSpeaking();
    this.currentAlert = null;
    this.alertStates.clear();
    this.sessionStartedAt = null;
    this.hasPlayedWelcome = false;
  }
}
