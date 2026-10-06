import { Injectable, signal } from "@angular/core";

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly createdAt: number;
  readonly duration: number;
  readonly isExiting?: boolean;
}

@Injectable({
  providedIn: "root",
})
export class ToastService {
  /**
   * 當前顯示中所有 Toast 訊息的 Signal 陣列。
   */
  readonly toasts = signal<readonly ToastItem[]>([]);

  private readonly timerMap = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly exitTimerMap = new Map<string, ReturnType<typeof setTimeout>>();
  private counter = 0;

  /**
   * 新增一筆 Toast 訊息。
   * @param message 訊息內容
   * @param variant 訊息類型 (success | warning | error | info)，預設為 info
   * @param duration 停留時間 (ms)，預設約 3 秒 (3000ms)
   * @returns 該 Toast 的唯一識別 ID
   */
  show(
    message: string,
    variant: ToastVariant = "info",
    duration = 3000
  ): string {
    const trimmed = message?.trim();
    if (!trimmed) return "";

    // 避免短時間內重複新增相同內容的 Toast
    const existing = this.toasts().find((t) => t.message === trimmed);
    if (existing) {
      // 若該訊息正在退場中，取消退場計時器並復原狀態
      const exitTimer = this.exitTimerMap.get(existing.id);
      if (exitTimer) {
        clearTimeout(exitTimer);
        this.exitTimerMap.delete(existing.id);
      }
      const oldTimer = this.timerMap.get(existing.id);
      if (oldTimer) {
        clearTimeout(oldTimer);
      }
      if (duration > 0) {
        const animDuration = 250;
        const stayDuration = Math.max(duration - animDuration, 0);
        const newTimer = setTimeout(() => {
          this.startExit(existing.id);
        }, stayDuration);
        this.timerMap.set(existing.id, newTimer);
      }
      this.toasts.update((list) =>
        list.map((t) =>
          t.id === existing.id
            ? { ...t, variant, isExiting: false }
            : t
        )
      );
      return existing.id;
    }

    const id = `toast-${Date.now()}-${++this.counter}`;
    const newToast: ToastItem = {
      id,
      message: trimmed,
      variant,
      createdAt: Date.now(),
      duration,
      isExiting: false,
    };

    // 新訊息加入陣列，支援多筆訊息疊加
    this.toasts.update((current) => [...current, newToast]);

    // 排程約 3 秒後自動消除（包含退場動畫）
    if (duration > 0) {
      const animDuration = 250;
      const stayDuration = Math.max(duration - animDuration, 0);
      const timer = setTimeout(() => {
        this.startExit(id);
      }, stayDuration);
      this.timerMap.set(id, timer);
    }

    return id;
  }

  success(message: string, duration = 3000): string {
    return this.show(message, "success", duration);
  }

  warning(message: string, duration = 3000): string {
    return this.show(message, "warning", duration);
  }

  error(message: string, duration = 3000): string {
    return this.show(message, "error", duration);
  }

  info(message: string, duration = 3000): string {
    return this.show(message, "info", duration);
  }

  /**
   * 啟動特定 Toast 的退場動畫，並在動畫結束後自動從佇列移除。
   */
  startExit(id: string, animDuration = 250): void {
    const toast = this.toasts().find((t) => t.id === id);
    if (!toast || toast.isExiting) return;

    // 清除主計時器
    const mainTimer = this.timerMap.get(id);
    if (mainTimer) {
      clearTimeout(mainTimer);
      this.timerMap.delete(id);
    }

    // 標記為退場中，觸發 CSS 退場與上方訊息下沉平移動畫
    this.toasts.update((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isExiting: true } : item
      )
    );

    // 動畫結束後正式從陣列移除
    const exitTimer = setTimeout(() => {
      this.exitTimerMap.delete(id);
      this.dismiss(id);
    }, animDuration);
    this.exitTimerMap.set(id, exitTimer);
  }

  /**
   * 根據 ID 立即關閉特定的 Toast 訊息。
   */
  dismiss(id: string): void {
    const timer = this.timerMap.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timerMap.delete(id);
    }
    const exitTimer = this.exitTimerMap.get(id);
    if (exitTimer) {
      clearTimeout(exitTimer);
      this.exitTimerMap.delete(id);
    }
    this.toasts.update((current) => current.filter((item) => item.id !== id));
  }

  /**
   * 清除所有 Toast 訊息與計時器。
   */
  clear(): void {
    for (const timer of this.timerMap.values()) {
      clearTimeout(timer);
    }
    this.timerMap.clear();
    for (const timer of this.exitTimerMap.values()) {
      clearTimeout(timer);
    }
    this.exitTimerMap.clear();
    this.toasts.set([]);
  }
}
