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
      description="Demo sürümünde canlı destek bağlı değildir. Sık yapılan işlemler için kısa yönlendirmeler:"
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
  const openQuestions = useOpenQuestionCount(shop.settings.storeName);
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
          try {
            logout();
            router.push("/");
          } catch {
            // Çıkış kaydedilemezse oturum açık kalır; kullanıcı tekrar deneyebilir.
          }
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
  const { ready, user, shop } = useDemo();

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
        description="Panel, bu tarayıcıdaki demo hesabına bağlı çalışır. Demo hesabınla giriş yap ya da yeni bir demo hesabı oluştur."
        actions={
          <>
            <Link href="/giris" className={linkButtonClass("primary")}>
              Giriş Yap
            </Link>
            <Link href="/demo" className={linkButtonClass("secondary")}>
              Demo Rehberi
            </Link>
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
        description="Satıcı panelini kullanmak için önce mağaza başvurusu yapmalısın. Başvuru demo rehberinden onaylanabilir."
        actions={
          <>
            <Link href="/satici-basvuru" className={linkButtonClass("primary")}>
              Mağaza Başvurusu Yap
            </Link>
            <Link href="/demo" className={linkButtonClass("secondary")}>
              Demo Rehberi
            </Link>
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
            <span className="font-semibold text-navy-700">{shop.settings.storeName}</span> başvurun (Ref: {shop.reference}) onay bekliyor. Demo ortamında onayı demo rehberinden verebilirsin.
          </>
        }
        actions={
          <>
            <Link href="/demo" className={linkButtonClass("primary")}>
              Demo Onayına Git
            </Link>
            <Link href="/satici-basvuru/durum" className={linkButtonClass("secondary")}>
              Başvuru Durumu
            </Link>
          </>
        }
      />
    );
  }

  if (shop.status === "reddedildi") {
    return (
      <GateCard
        icon={ShieldX}
        title="Başvurun reddedildi"
        description="Bu mağaza başvurusu reddedildi. Bilgilerini güncelleyerek yeniden başvurabilirsin."
        actions={
          <Link href="/satici-basvuru" className={linkButtonClass("primary")}>
            Yeniden Başvur
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
