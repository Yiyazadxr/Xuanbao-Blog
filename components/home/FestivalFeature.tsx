"use client";

import { FESTIVALS, getFestivalsForDay, type FestivalId } from "@/lib/festivals";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function FestivalFeature({ day }: { day: string }) {
  const festivals = getFestivalsForDay(day);
  const reduceMotion = usePrefersReducedMotion();
  const [imprinted, setImprinted] = useState<string[]>([]);
  const [openFestivalId, setOpenFestivalId] = useState<FestivalId | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (openFestivalId && !dialog.open) {
      dialog.showModal();
    } else if (!openFestivalId && dialog.open) {
      dialog.close();
    }
  }, [openFestivalId]);

  if (!festivals.length) return null;

  const activeFestival = openFestivalId ? FESTIVALS[openFestivalId] : null;
  const activeStampKey = openFestivalId ? `${day}:${openFestivalId}` : "";
  const activeIsImprinted = activeStampKey ? imprinted.includes(activeStampKey) : false;

  const closeDialog = () => {
    setOpenFestivalId(null);
    triggerRef.current?.focus();
  };

  return (
    <>
      <aside aria-label="今日节日主题" className="mt-10 space-y-8 sm:mt-14">
        {festivals.map((id, index) => {
          const festival = FESTIVALS[id];
          const stampKey = `${day}:${id}`;
          const isImprinted = imprinted.includes(stampKey);

          return (
            <section key={`${day}-${id}`} data-festival={id} className="festival-scene relative isolate overflow-hidden border-y border-border/80 py-7 sm:py-9">
              <div aria-hidden="true" className="festival-art">
                <span className="festival-art-orb" />
                <span className="festival-art-horizon" />
                <span className="festival-art-seal">{festival.seal}</span>
              </div>
              <div className="relative z-10 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
                <div className="max-w-2xl">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    <span className="festival-kicker-mark" aria-hidden="true" />
                    {festival.name} · 今日限定 · <time dateTime={day}>{day}</time>
                  </p>
                  {index === 0 ? (
                    <h1 className="festival-title mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">{festival.title}</h1>
                  ) : (
                    <h2 className="festival-title mt-3 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">{festival.title}</h2>
                  )}
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{festival.summary}</p>
                  <button
                    type="button"
                    className="festival-letter-trigger mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={(event) => {
                      // 鼠标与键盘都经过 click；在这里记录触发按钮，避免多个按钮共用 ref 时 closeDialog 聚焦错对象。
                      triggerRef.current = event.currentTarget;
                      setOpenFestivalId(id);
                    }}
                  >
                    <span aria-hidden="true">✉</span>
                    <span>打开今日短笺</span>
                  </button>
                </div>
                <div aria-hidden="true" className={`festival-stamp ${isImprinted ? "is-imprinted" : ""}`}>
                  <span>{festival.seal}</span>
                  <span className="festival-stamp-date">{day.slice(5).replace("-", ".")}</span>
                </div>
              </div>
            </section>
          );
        })}
      </aside>

      <dialog
        ref={dialogRef}
        aria-labelledby="festival-letter-title"
        data-festival={openFestivalId ?? undefined}
        className={`festival-letter-dialog ${reduceMotion ? "reduced-motion" : ""}`}
        onClose={closeDialog}
      >
        {activeFestival && openFestivalId && (
          <div className="festival-letter-dialog-inner">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{activeFestival.name} · {day}</p>
                <h2 id="festival-letter-title" className="festival-title mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{activeFestival.title}</h2>
              </div>
              <button type="button" className="festival-dialog-close" onClick={closeDialog} aria-label="关闭今日短笺">×</button>
            </div>
            <p className="festival-letter-dialog-copy mt-6 border-s-2 border-current/30 ps-4 text-sm leading-loose text-foreground sm:text-base">{activeFestival.letter}</p>
            {activeFestival.action && (
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  aria-pressed={activeIsImprinted}
                  onClick={() => setImprinted((current) => current.includes(activeStampKey) ? current.filter((key) => key !== activeStampKey) : [...current, activeStampKey])}
                  className={`festival-stamp-button ${activeIsImprinted ? "is-imprinted" : ""} ${reduceMotion ? "reduced-motion" : ""}`}
                >
                  <span aria-hidden="true" className="festival-stamp-button-mark">{activeIsImprinted ? "印" : "＋"}</span>
                  <span>{activeIsImprinted ? "今日印记已留" : activeFestival.action}</span>
                </button>
                {activeIsImprinted && <p role="status" aria-live="polite" className="text-sm text-foreground/75">{activeFestival.response}</p>}
              </div>
            )}
            {!activeFestival.action && <p className="mt-6 text-sm text-muted">这封短笺不需要盖印，愿你安静读完。</p>}
          </div>
        )}
      </dialog>
    </>
  );
}
