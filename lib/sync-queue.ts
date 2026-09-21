/**
 * Sıralı eşitleme kuyruğu (SAF, React'ten bağımsız).
 *
 * Satıcı paneli değişiklikleri ekranda anında görünür (iyimser güncelleme) ve sunucuya SIRAYLA yazılır.
 * Bir iş başarısız olursa kuyruk DURUR: sonraki işler önceki değişikliğe dayandığı için devam edilmez.
 * Kullanıcı ya yeniden dener (`retry`) ya da bırakır (`clear`) — sessiz veri kaybı olmaz.
 */
import { friendlyError } from "@/lib/domain/errors";

export type QueueSnapshot = { status: "idle" | "syncing" | "error"; pending: number; error: string | null };

type Job = { label: string; run: () => Promise<void> };

export class SyncQueue {
  private jobs: Job[] = [];
  private running = false;
  private failure: string | null = null;
  private generation = 0;
  private idleWaiters: (() => void)[] = [];

  constructor(private readonly onChange: (snapshot: QueueSnapshot) => void, private readonly onIdle?: () => void) {}

  snapshot(): QueueSnapshot {
    if (this.failure !== null) return { status: "error", pending: this.jobs.length, error: this.failure };
    return { status: this.jobs.length > 0 ? "syncing" : "idle", pending: this.jobs.length, error: null };
  }

  enqueue(label: string, run: () => Promise<void>): void {
    this.jobs.push({ label, run });
    this.emit();
    void this.pump();
  }

  /** Başarısız işi ve sonrakileri yeniden dener. */
  retry(): void {
    if (this.failure === null) return;
    this.failure = null;
    this.emit();
    void this.pump();
  }

  /** Bekleyen tüm işleri ve hatayı atar; atılan iş sayısını döndürür. Çalışmakta olan iş tamamlanır ama sonucu yok sayılır. */
  clear(): number {
    const dropped = this.jobs.length;
    this.jobs = [];
    this.failure = null;
    this.generation += 1;
    this.emit();
    this.resolveIdle();
    return dropped;
  }

  /** Kuyruk boşalana (ya da süre dolana) kadar bekler; boşaldıysa `true`. Hata varsa hemen `false`. */
  whenIdle(timeoutMs: number): Promise<boolean> {
    if (this.jobs.length === 0) return Promise.resolve(true);
    if (this.failure !== null) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.idleWaiters = this.idleWaiters.filter((waiter) => waiter !== done);
        resolve(false);
      }, timeoutMs);
      const done = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.idleWaiters.push(done);
    });
  }

  private emit(): void {
    this.onChange(this.snapshot());
  }

  private resolveIdle(): void {
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const waiter of waiters) waiter();
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const generation = this.generation;
    try {
      while (this.jobs.length > 0 && this.failure === null && generation === this.generation) {
        const job = this.jobs[0];
        try {
          await job.run();
        } catch (error) {
          if (generation !== this.generation) break;
          this.failure = friendlyError(error);
          this.emit();
          return;
        }
        if (generation !== this.generation) break;
        this.jobs.shift();
        this.emit();
      }
    } finally {
      this.running = false;
    }
    if (generation !== this.generation) {
      // clear() sırasında çalışan iş bitti; yeni işler varsa devam et.
      if (this.jobs.length > 0 && this.failure === null) void this.pump();
      return;
    }
    if (this.jobs.length === 0 && this.failure === null) {
      this.resolveIdle();
      this.onIdle?.();
    }
  }
}
