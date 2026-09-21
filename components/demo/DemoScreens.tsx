"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { useDemo } from "./DemoProvider";
import { orderLabels, shopProduct, isSellable, type DemoOrderStatus } from "@/lib/demo-marketplace";
import { ProductCard } from "@/components/home/ProductCard";
import { LiveProduct } from "@/components/product/LiveProduct";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/utils";
import { useAsync } from "@/lib/use-async";
const button = "inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const card = "rounded-2xl border border-navy-100 bg-white p-5 sm:p-6";
export function DemoBar() {
  const { user, storageError, mode, role, sellerAccount, configProblem, refresh, logout } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  // Satıcı paneli kendi başlığında demo bilgisini gösterir; ek şerit tam yükseklikli yan menüyü bozar.
  if (pathname?.startsWith("/satici-panel")) return null;
  if (mode === "supabase") {
    const signOut = async () => {
      setBusy(true);
      setSignOutError("");
      try { await logout(); router.push("/"); router.refresh(); } catch (e) { setSignOutError((e as Error).message); } finally { setBusy(false); }
    };
    return <div className="border-b border-brand-100 bg-brand-50 text-xs text-brand-800"><div className="section-container flex flex-wrap items-center justify-between gap-2 py-2"><span>Canlı hesap modu · Ödeme sağlayıcısı henüz bağlı değil, gerçek ödeme alınmaz</span><div className="flex flex-wrap gap-4"><Link href="/hesabim">{user?.name ?? "Hesabım"}</Link>{user && <Link href="/siparislerim">Siparişlerim</Link>}{(role === "seller" || role === "admin" || sellerAccount) && <Link href="/satici-panel">Satıcı paneli</Link>}{role === "admin" && <Link href="/yonetim">Yönetim</Link>}{user ? <button type="button" disabled={busy} onClick={signOut} className="font-semibold">Çıkış yap</button> : <Link href="/giris" className="font-semibold">Giriş yap</Link>}</div>{signOutError && <p role="alert" className="w-full text-rose-700">{signOutError}</p>}{storageError && <p role="alert" className="w-full text-rose-700">{storageError} <button type="button" className="font-bold underline" onClick={() => { void refresh(); }}>Yeniden dene</button></p>}</div></div>;
  }
  return <div className="border-b border-brand-100 bg-brand-50 text-xs text-brand-800"><div className="section-container flex flex-wrap items-center justify-between gap-2 py-2"><span>Demo · Gerçek ödeme alınmaz · Veriler bu tarayıcıda saklanır</span><div className="flex flex-wrap gap-4"><Link href="/demo" className="font-bold">Demo rehberi</Link><Link href="/hesabim">{user?.name ?? "Demo hesabım"}</Link><Link href="/siparislerim">Siparişlerim</Link><Link href="/satici-panel">Satıcı paneli</Link></div>{storageError && <p role="alert" className="w-full text-rose-700">{storageError}</p>}{configProblem && <p role="alert" className="w-full text-amber-800">{configProblem}</p>}</div></div>;
}
export function DemoCatalog({ compact = false, initialQuery = "" }: { compact?: boolean; initialQuery?: string }) {
  const { mode } = useDemo();
  return mode === "supabase" ? <LiveCatalog compact={compact} initialQuery={initialQuery} /> : <LocalCatalog compact={compact} initialQuery={initialQuery} />;
}
const LIVE_PAGE_SIZE = 24;
/** Gerçek mod: yayındaki mağaza ürünleri sunucu tarafında aranır ve sayfalanır. */
function LiveCatalog({ compact, initialQuery }: { compact: boolean; initialQuery: string }) {
  const { catalog, ready, searchCatalog } = useDemo();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (compact) return;
    const timer = setTimeout(() => {
      // Arama metni oturduktan sonra ilk sayfaya dön (yazarken gereksiz istek atılmaz).
      setQuery(input.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, compact]);
  const load = useCallback(() => searchCatalog({ query, page, pageSize: LIVE_PAGE_SIZE }), [searchCatalog, query, page]);
  const result = useAsync(compact ? null : load);
  if (compact) return catalog.length && ready ? <section className="space-y-4"><h2 className="text-xl font-extrabold">Satıcıların eklediği ürünler</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{catalog.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}</div></section> : null;
  const total = result.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIVE_PAGE_SIZE));
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Satıcıların eklediği ürünler</h2><input aria-label="Ürünlerde ara" value={input} onChange={e => setInput(e.target.value)} placeholder="Ürün, kategori veya marka ara" maxLength={60} className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm" /></div>
    {result.error ? <p role="alert" className={card}>Ürünler yüklenemedi. {result.error} <button type="button" className="font-semibold text-brand-600 underline" onClick={result.reload}>Tekrar dene</button></p>
    : result.loading && !result.data ? <p role="status">Ürünler yükleniyor…</p>
    : !result.data?.items.length ? <p className={card}>{query ? "Aramana uygun ürün bulunamadı." : "Henüz yayında ürün yok."}</p>
    : <><div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{result.data.items.map(p => <ProductCard key={p.id} product={p} />)}</div>{pages > 1 && <nav aria-label="Sayfalama" className="flex items-center justify-center gap-4 text-sm"><button type="button" disabled={page === 0 || result.loading} onClick={() => setPage(page - 1)} className="rounded-xl border border-navy-200 px-4 py-2 disabled:opacity-40">Önceki</button><span>Sayfa {page + 1} / {pages}</span><button type="button" disabled={page + 1 >= pages || result.loading} onClick={() => setPage(page + 1)} className="rounded-xl border border-navy-200 px-4 py-2 disabled:opacity-40">Sonraki</button></nav>}</>}</section>;
}
function LocalCatalog({ compact = false, initialQuery = "" }: { compact?: boolean; initialQuery?: string }) {
  const { state, ready } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const products = state.shops.filter(s => s.status === "onaylandi").flatMap(s => s.products.filter(isSellable).map(p => shopProduct(p, s))).filter(p => `${p.name} ${p.category} ${p.seller}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  if (compact && !products.length) return null;
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Satıcıların eklediği ürünler</h2><input aria-label="Demo ürünlerinde ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ürün veya mağaza ara" className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm" /></div>{!ready ? <p>Ürünler yükleniyor…</p> : !products.length ? <p className={card}>Henüz ürün yok veya aramana uygun ürün bulunamadı. Onaylı mağazanın panelinden ürün ekleyebilirsin.</p> : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{products.slice(0, compact ? 4 : undefined).map(p => <ProductCard key={p.id} product={p} />)}</div>}</section>;
}
/** Gerçek modda demo simülasyon kontrolleri (sahte onay, sipariş ilerletme) yoktur; gerçek akış anlatılır. */
function LiveHub() {
  const { user, role, sellerAccount } = useDemo();
  const steps: [string, string, string][] = [
    ["1. Hesap", user ? "Giriş yaptın." : "E-posta ve şifreyle hesap oluştur ya da giriş yap.", user ? "/hesabim" : "/kayit"],
    ["2. Mağaza başvurusu", sellerAccount ? "Başvurun kayıtlı; durumunu görebilirsin." : "Mağaza bilgilerini gönder. Başvuru bir yönetici tarafından onaylanana kadar mağazan kapalı kalır.", sellerAccount ? "/satici-basvuru/durum" : "/satici-basvuru"],
    ["3. Ürün ve sipariş", "Onaylandıktan sonra satıcı panelinden ürün ekle; müşteriler ürünü sepete ekleyip sipariş verir.", "/satici-panel"],
  ];
  return <div className="space-y-8"><section className="rounded-3xl bg-navy-900 p-6 text-white sm:p-10"><p className="text-sm text-purple-200">VitrinPlus / Canlı hesap modu</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Gerçek hesaplar, gerçek kayıtlar.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Bu ortamda hesaplar, mağazalar, ürünler ve siparişler veritabanında saklanır. Tarayıcı içi demo simülasyonu (sahte onay, sipariş ilerletme, örnek veri) bu modda kapalıdır. Ödeme sağlayıcısı henüz bağlı değildir; siparişlerde tahsilat yapılmaz.</p></section>
    <div className="grid gap-5 lg:grid-cols-3">{steps.map(([title, text, href]) => <section key={title} className={card}><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-navy-500">{text}</p><Link className="mt-4 inline-block font-semibold text-brand-600" href={href}>Git →</Link></section>)}</div>
    {role === "admin" && <section className={card}><h2 className="text-lg font-bold">Yönetim</h2><p className="mt-2 text-sm text-navy-500">Satıcı başvurularını incelemek ve ödemeleri planlamak için yönetim ekranını kullan.</p><Link className="mt-4 inline-block font-semibold text-brand-600" href="/yonetim">Yönetim ekranı →</Link></section>}
    <DemoCatalog /></div>;
}
export function DemoHub() {
  const demo = useDemo();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  function run(action: () => void) { try { action(); setError(""); } catch (e) { setError((e as Error).message); } }
  function submit(event: FormEvent) { event.preventDefault(); run(() => demo.apply(name)); }
  if (demo.mode === "supabase") return <LiveHub />;
  return <div className="space-y-8"><section className="rounded-3xl bg-navy-900 p-6 text-white sm:p-10"><p className="text-sm text-purple-200">VitrinPlus / Uçtan uca demo</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Mağazanı aç. Ürününü sat.<br />Siparişini takip et.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Hesap oluştur → mağaza başvurusu yap → aşağıdan demo onayı ver → satıcı panelinden ürün ekle → ürünü satın al → siparişi ilerlet. Farklı alıcı ve satıcı hesaplarını aynı tarayıcıda deneyebilirsin.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={button} href={demo.user ? "/hesabim" : "/kayit"}>{demo.user ? "Hesabım" : "1. Demo hesabı oluştur"}</Link><Link className="rounded-xl border border-white/30 px-4 py-2.5 text-sm" href="/satici-panel">Satıcı paneli</Link></div></section>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-2"><section className={card}><h2 className="text-xl font-bold">2. Mağaza başvurusu</h2><p className="mt-2 text-sm text-navy-500">Demo için yalnızca mağaza adı yeterli. Gerçek kimlik veya banka bilgisi girme.</p>{!demo.ready ? <p>Yükleniyor…</p> : !demo.user ? <Link className="mt-4 inline-block text-brand-600" href="/giris">Başvurmak için giriş yap</Link> : demo.shop && demo.shop.status !== "reddedildi" ? <div className="mt-5 space-y-3"><p className="font-bold">{demo.shop.settings.storeName}</p><p className="text-sm">{demo.shop.reference} · {demo.shop.status === "onaylandi" ? "Onaylandı" : "Onay bekliyor"}</p>{demo.shop.status === "onaylandi" && <Link className={button} href="/satici-panel">Ürün eklemeye geç</Link>}</div> : <form onSubmit={submit} className="mt-4 flex flex-col gap-3"><label className="text-sm">Mağaza adı<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-xl border border-navy-200 p-3" /></label><button className={button}>Demo başvurusu gönder</button></form>}</section>
    <section className={card}><h2 className="text-xl font-bold">3. Yönetici simülasyonu</h2><p className="mt-2 text-sm text-navy-500">Bu açık demo kontrolüdür. Gerçek yönetici yetkilendirmesi veya belge incelemesi yapılmaz.</p><div className="mt-4 space-y-3">{demo.state.shops.filter(s => s.status === "bekliyor").map(s => <div key={s.reference} className="rounded-xl bg-navy-50 p-4"><p className="font-semibold">{s.settings.storeName}</p><p className="my-2 text-xs">{s.reference}</p><div className="flex gap-3"><button className={button} onClick={() => run(() => demo.review(s.reference, "onaylandi"))}>Demo onayı ver</button><button className="text-sm text-rose-600" onClick={() => run(() => demo.review(s.reference, "reddedildi"))}>Reddet</button></div></div>)}{!demo.state.shops.some(s => s.status === "bekliyor") && <p className="text-sm text-navy-400">Bekleyen başvuru yok.</p>}</div></section></div>
    <DemoCatalog /><section className={card}><h2 className="mb-4 text-xl font-bold">Sipariş yönetimi simülasyonu</h2><p className="mb-4 text-sm text-navy-500">Tüm demo siparişlerini burada ilerletebilirsin. Çok satıcılı siparişlerin ortak durumunu bu simülasyon yönetir.</p><DemoOrders admin /></section></div>;
}
export function DemoOrders({ admin = false, seller = false }: { admin?: boolean; seller?: boolean }) {
  const demo = useDemo();
  const [error, setError] = useState("");
  const orders = demo.state.orders.filter(o => admin || (seller ? o.items.some(i => i.ownerId === demo.user?.id) : o.buyerId === demo.user?.id));
  function change(id: string, status: DemoOrderStatus) { try { demo.changeOrder(id, status, admin); setError(""); } catch(e) { setError((e as Error).message); } }
  if (!demo.ready) return <p>Siparişler yükleniyor…</p>;
  if (!admin && !demo.user) return <Link href="/giris" className="text-brand-600">Siparişlerini görmek için giriş yap.</Link>;
  return <div className="space-y-4">{error && <p role="alert" className="text-rose-600">{error}</p>}{!orders.length && <p className="text-sm text-navy-500">Henüz sipariş yok. <Link href="/" className="text-brand-600">Alışverişe başla.</Link></p>}{orders.map(order => <article key={order.id} className="rounded-xl border border-navy-100 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{order.id}</h3><span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">{orderLabels[order.status]}</span></div><p className="mt-1 text-xs text-navy-400">{new Date(order.createdAt).toLocaleString("tr-TR")} {demo.mode === "supabase" ? "" : " · Demo sipariş"}</p><ul className="my-4 space-y-2 text-sm">{order.items.filter(i => !seller || i.ownerId === demo.user?.id).map((i, index) => <li key={index} className="flex justify-between gap-3"><span>{i.name} {i.variantLabel && `(${i.variantLabel})`} × {i.quantity}<small className="block text-navy-400">{i.seller}</small></span><span>{formatPrice(i.price * i.quantity)}</span></li>)}</ul><p className="text-sm font-bold">{seller ? "Siparişin genel toplamı" : "Genel toplam"}: {formatPrice(order.total)}</p><p className="mt-2 text-xs text-navy-500">{order.address}</p><div className="mt-4 flex flex-wrap gap-3">{(admin || seller && order.items.every(i => i.ownerId === demo.user?.id)) && order.status === "alindi" && <button className={button} onClick={() => change(order.id, "hazirlaniyor")}>Hazırlamaya başla</button>}{(admin || seller && order.items.every(i => i.ownerId === demo.user?.id)) && order.status === "hazirlaniyor" && <button className={button} onClick={() => change(order.id, "kargoda")}>Kargoya ver</button>}{(admin || seller && order.items.every(i => i.ownerId === demo.user?.id)) && order.status === "kargoda" && <button className={button} onClick={() => change(order.id, "teslim-edildi")}>Teslim edildi</button>}{!seller && !admin && order.status === "teslim-edildi" && <Link href="/hesabim/iadeler" className="text-sm font-semibold text-brand-600">İade talebi oluştur →</Link>}{["alindi", "hazirlaniyor"].includes(order.status) && (admin || !seller) && <button className="text-sm text-rose-600" onClick={() => change(order.id, "iptal-edildi")}>Siparişi iptal et</button>}</div></article>)}</div>;
}
export function DemoProduct({ slug }: { slug: string }) {
  const { mode } = useDemo();
  return mode === "supabase" ? <LiveProduct slug={slug} /> : <LocalDemoProduct slug={slug} />;
}
function LocalDemoProduct({ slug }: { slug: string }) {
  const { resolveProduct, ready } = useDemo();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const product = resolveProduct(slug);
  if (!ready) return <p>Ürün yükleniyor…</p>;
  if (!product) return <div className={card}>Bu ürün artık satışta değil. <Link href="/demo" className="text-brand-600">Diğer ürünler</Link></div>;
  return <div className="grid gap-8 md:grid-cols-2"><div className="flex min-h-64 items-center justify-center rounded-3xl bg-brand-50"><Package size={100} className="text-brand-400" /></div><section className={card}><p className="text-sm text-brand-600">{product.seller}</p><h1 className="mt-4 text-3xl font-extrabold">{product.name}</h1><p className="mt-4 text-sm text-navy-500">{product.description}</p><p className="my-5 text-3xl font-bold">{formatPrice(product.price)}</p><p className="mb-4 text-sm">Stok: {product.stock} adet · {product.category}</p><button disabled={product.stock < 1} className={button} onClick={() => { addItem({ slug }); setAdded(true); }}>{product.stock < 1 ? "Stok tükendi" : "Sepete ekle"}</button>{added && <p role="status" className="mt-4 text-sm text-emerald-700">Sepete eklendi. <Link href="/sepet" className="font-bold underline">Sepete git</Link></p>}</section></div>;
}
