"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, Clock, Lock, LogIn, LogOut, ShieldX, Store } from "lucide-react";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LoadingState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import type { SidebarAction } from "@/components/dashboard/Sidebar";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerWorkspaceProvider, useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { VitrinAiPanel, VitrinAiPromoCard } from "@/components/seller/VitrinAi";
import { buildSellerNav, sellerHref } from "@/components/seller/seller-nav";
import { useOpenQuestionCount } from "@/lib/questions";
import { useOpenQuestionBadge } from "@/components/seller/useOpenQuestionBadge";

function GateCard({ icon: Icon, title, description, actions }: { icon: typeof Lock; title: string; description: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-panel">
        <span aria-hidden className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-royal-50 text-royal-600">
          <Icon size={26} />
        </span>
        <h1 className="text-xl font-extrabold text-navy-900">{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

const helpTopics: { title: string; body: string; href: string; cta: string }[] = [
  { title: "Sipariş nasıl kargoya verilir?", body: "Siparişler ekranında siparişleri seç, sırayla Toplu Hazırla → Kargo Etiketi Oluştur → Etiketleri Yazdır → Kargoya Ver adımlarını izle.", href: sellerHref.orders, cta: "Siparişlere git" },
  { title: "Stoğu Excel olmadan nasıl güncellerim?", body: "Stok Yönetimi ekranında \"yeni stok\" alanını düzenle ve Değişiklikleri Kaydet'e bas. Tüm paketlerde açıktır.", href: sellerHref.stock, cta: "Stok yönetimine git" },
  { title: "Doğru satış fiyatını nasıl bulurum?", body: "Yeni ürün ekranındaki canlı kâr hesaplayıcı maliyetlerini toplar ve hedef kâr marjına göre önerilen fiyatı hesaplar.", href: sellerHref.newProduct, cta: "Ürün ekle" },
];

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yardım Merkezi"
      description="Canlı destek şu an bağlı değil. Sık yapılan işlemler için kısa yönlendirmeler:"
      footer={
        <ActionButton variant="secondary" onClick={onClose}>
          Kapat
        </ActionButton>
      }
    >
      <ul className="space-y-3">
        {helpTopics.map((topic) => (
          <li key={topic.title} className="rounded-xl border border-line p-3.5">
            <p className="text-[13px] font-bold text-navy-900">{topic.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{topic.body}</p>
            <Link href={topic.href} onClick={onClose} className="mt-2 inline-block text-xs font-bold text-royal-600 hover:text-royal-800">
              {topic.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ShellWithData({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { logout } = useDemo();
  const { waitingOrders, shop } = useSellerWorkspace();
  const localQuestions = useOpenQuestionCount(shop.settings.storeName);
  const openQuestions = useOpenQuestionBadge(localQuestions);
  const [helpOpen, setHelpOpen] = useState(false);
  const nav = useMemo(() => buildSellerNav({ orders: waitingOrders, questions: openQuestions }), [waitingOrders, openQuestions]);
  const actions = useMemo<SidebarAction[]>(
    () => [
      { key: "help", label: "Yardım Merkezi", icon: CircleHelp, onClick: () => setHelpOpen(true) },
      {
        key: "logout",
        label: "Çıkış Yap",
        icon: LogOut,
        onClick: () => {
          // Çıkış kaydedilemezse (ör. eşitlenmemiş değişiklik) oturum açık kalır; kullanıcı tekrar deneyebilir.
          Promise.resolve()
            .then(() => logout())
            .then(() => {
              router.push("/");
              router.refresh();
            })
            .catch(() => undefined);
        },
      },
    ],
    [logout, router]
  );
  return (
    <>
      <DashboardShell nav={nav} subtitle="Satıcı Paneli" promo={<VitrinAiPromoCard />} actions={actions} header={(shell) => <SellerHeader shell={shell} />}>
        <Suspense fallback={<LoadingState label="Sayfa yükleniyor…" />}>{children}</Suspense>
      </DashboardShell>
      <VitrinAiPanel />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

/**
 * Satıcı paneli kapısı: demo hesabı, mağaza ve onay durumuna göre ilgili
 * bilgilendirme ekranını ya da paneli gösterir. Boş/kırık sayfa göstermez.
 */
export function SellerLayoutClient({ children }: { children: ReactNode }) {
  const { ready, user, shop, mode, role, sellerAccount } = useDemo();
  const live = mode === "supabase";

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Mağaza paneli yükleniyor…" />
      </div>
    );
  }

  if (!user) {
    return (
      <GateCard
        icon={LogIn}
        title="Satıcı paneli için giriş yap"
        description={live ? "Satıcı panelini kullanmak için hesabınla giriş yapmalısın." : "Panel, bu tarayıcıdaki demo hesabına bağlı çalışır. Demo hesabınla giriş yap ya da yeni bir demo hesabı oluştur."}
        actions={
          <>
            <Link href={live ? "/giris?next=%2Fsatici-panel" : "/giris"} className={linkButtonClass("primary")}>
              Giriş Yap
            </Link>
            {!live && (
              <Link href="/demo" className={linkButtonClass("secondary")}>
                Demo Rehberi
              </Link>
            )}
          </>
        }
      />
    );
  }

  if (!shop) {
    return (
      <GateCard
        icon={Store}
        title="Mağazanı açarak başla"
        description={live ? "Satıcı panelini kullanmak için önce mağaza başvurusu yapmalısın. Başvurun yönetici tarafından incelendikten sonra mağazan açılır." : "Satıcı panelini kullanmak için önce mağaza başvurusu yapmalısın. Başvuru demo rehberinden onaylanabilir."}
        actions={
          <>
            <Link href="/satici-basvuru" className={linkButtonClass("primary")}>
              Mağaza Başvurusu Yap
            </Link>
            {!live && (
              <Link href="/demo" className={linkButtonClass("secondary")}>
                Demo Rehberi
              </Link>
            )}
          </>
        }
      />
    );
  }

  if (shop.status === "bekliyor") {
    return (
      <GateCard
        icon={Clock}
        title="Başvurun inceleniyor"
        description={
          <>
            <span className="font-semibold text-navy-700">{shop.settings.storeName}</span> başvurun (Ref: {shop.reference}) onay bekliyor.{" "}
            {live ? "Onaylanana kadar mağazan kapalıdır ve ürünlerin satışa çıkmaz." : "Demo ortamında onayı demo rehberinden verebilirsin."}
          </>
        }
        actions={
          <>
            {!live && (
              <Link href="/demo" className={linkButtonClass("primary")}>
                Demo Onayına Git
              </Link>
            )}
            <Link href="/satici-basvuru/durum" className={linkButtonClass(live ? "primary" : "secondary")}>
              Başvuru Durumu
            </Link>
          </>
        }
      />
    );
  }

  if (shop.status === "reddedildi") {
    const suspended = sellerAccount?.status === "suspended";
    return (
      <GateCard
        icon={ShieldX}
        title={suspended ? "Mağazan askıya alındı" : "Başvurun reddedildi"}
        description={
          <>
            {suspended ? "Mağazan şu an satış yapamıyor." : "Bu mağaza başvurusu reddedildi."}
            {sellerAccount?.rejectionReason ? <span className="mt-2 block rounded-lg bg-navy-50 p-2 text-left text-xs text-navy-700">Gerekçe: {sellerAccount.rejectionReason}</span> : null}
            {suspended ? " Ayrıntı için destek ekibiyle iletişime geç." : " Bilgilerini güncelleyerek yeniden başvurabilirsin."}
          </>
        }
        actions={
          suspended ? (
            <Link href="/satici-basvuru/durum" className={linkButtonClass("secondary")}>
              Başvuru Durumu
            </Link>
          ) : (
            <Link href="/satici-basvuru" className={linkButtonClass("primary")}>
              Yeniden Başvur
            </Link>
          )
        }
      />
    );
  }

  // Derinlemesine savunma: sunucu zaten yetkiyi denetler; rol uyuşmazsa panel açılmaz.
  if (live && role !== "seller" && role !== "admin") {
    return (
      <GateCard
        icon={ShieldX}
        title="Bu sayfaya erişimin yok"
        description="Satıcı paneli yalnızca onaylı satıcı hesaplarına açıktır."
        actions={
          <Link href="/hesabim" className={linkButtonClass("primary")}>
            Hesabıma Dön
          </Link>
        }
      />
    );
  }

  return (
    <SellerWorkspaceProvider owner={user} shop={shop}>
      <ShellWithData>{children}</ShellWithData>
    </SellerWorkspaceProvider>
  );
}
