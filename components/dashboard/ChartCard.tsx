import type { ReactNode } from "react";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { cn } from "@/lib/utils";

/** Başlık + sağ kontroller + grafik gövdesi. */
export function ChartCard({
  title,
  subtitle,
  controls,
  children,
  footer,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn("flex flex-col", className)}>
      <PanelHeader title={title} subtitle={subtitle} action={controls} />
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? <div className="mt-4 border-t border-line pt-3">{footer}</div> : null}
    </Panel>
  );
}
