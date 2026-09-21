/**
 * Aşama 2 — veritabanından BAĞIMSIZ alan (domain) testleri.
 *
 * Bu testler saf TypeScript kurallarını (lib/domain/*, lib/auth/paths, lib/supabase/env) çalıştırır; ağ ya da Supabase gerekmez.
 * SQL tarafının gerçek davranışı ayrıca `supabase/tests/` altındaki testlerle doğrulanır; burada ise
 * TS kuralları ile SQL kaynağının BİREBİR aynı olduğu (durum grafikleri, limitler, komisyon) metin düzeyinde karşılaştırılır.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const cache = new Map();

/** TS modüllerini (göreli ve "@/…" içe aktarmalarıyla) CommonJS'e çevirip yükler. */
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full).exports;
  const source = fs.readFileSync(full, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: full }).outputText;
  const loaded = { exports: {} };
  cache.set(full, loaded);
  const resolve = spec => {
    const base = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(full), spec);
    for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(candidate)) return candidate;
    throw new Error(`Modül çözümlenemedi: ${spec} (${file})`);
  };
  vm.runInNewContext(js, { module: loaded, exports: loaded.exports, require: spec => load(resolve(spec)), Date, Map, Set, Error, URL, atob, TextEncoder, setTimeout, clearTimeout, process: { env: {} } }, { filename: full });
  return loaded.exports;
}

const errors = load('lib/domain/errors.ts');
const product = load('lib/domain/product.ts');
const stock = load('lib/domain/stock.ts');
const orders = load('lib/domain/order-engine.ts');
const returns = load('lib/domain/returns.ts');
const questions = load('lib/domain/questions.ts');
const ledger = load('lib/domain/ledger.ts');
const favorites = load('lib/domain/favorites.ts');
const application = load('lib/domain/application.ts');
const paths = load('lib/auth/paths.ts');
const account = load('lib/domain/account.ts');
const storageValidate = load('lib/storage/validate.ts');
const shopDiff = load('lib/repositories/shop-diff.ts');
const mappers = load('lib/repositories/supabase/mappers.ts');
const services = load('lib/services/index.ts');
const env = load('lib/supabase/env.ts');
const plans = load('lib/plans.ts');
const demo = load('lib/demo-marketplace.ts');
const syncQueue = load('lib/sync-queue.ts');
const opsMerge = load('lib/seller-ops-merge.ts');
const credentials = load('lib/auth/credentials.ts');
const cartQuote = load('lib/domain/cart-quote.ts');
const productForm = load('lib/product-form.ts');
const liveFinance = load('lib/seller-live-finance.ts');
const movementUi = load('lib/stock-movement-ui.ts');
const sql = name => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8');
const functions = sql('0004_functions.sql');
const foundation = sql('0001_foundation.sql');

/** vm bağlamında üretilen nesnelerin prototipi farklıdır; karşılaştırmadan önce düz JSON'a çevrilir. */
const same = (actual, expected) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);

const SELLER_A = { id: 'seller-a', role: 'seller' };
const SELLER_B = { id: 'seller-b', role: 'seller' };
const BUYER = { id: 'buyer-1', role: 'customer' };
const OTHER_BUYER = { id: 'buyer-2', role: 'customer' };
const ADMIN = { id: 'admin-1', role: 'admin' };
const ANON = { id: null, role: null };
const order = (status = 'new') => ({ buyerId: BUYER.id, sellerId: SELLER_A.id, status });

// ─── 1. Ürün yetkisi ────────────────────────────────────────────────────────
test('Satıcı başka satıcının ürününü yönetemez; kendi ürününü ve yönetici her ürünü yönetebilir', () => {
  const productOfB = { sellerId: SELLER_B.id };
  assert.equal(product.canManageProduct(SELLER_A, productOfB), false);
  assert.equal(product.canManageProduct(SELLER_B, productOfB), true);
  assert.equal(product.canManageProduct(ADMIN, productOfB), true);
  assert.equal(product.canManageProduct(BUYER, productOfB), false);
  assert.equal(product.canManageProduct(ANON, productOfB), false);
});

// ─── 2. Maliyet müşteriye sızmaz ────────────────────────────────────────────
test('Müşteri ürün modeli maliyet / ek maliyet / satıcı kimliği içermez', () => {
  const dirty = { id: 'p1', store_id: 's1', name: 'Kulaklık', sku: 'K-1', brand: null, model: null, category: 'Ses', short_description: '', description: 'x', price: 200, discount_price: null, discount_start: null, discount_end: null, stock: 5,
    cost: 90, extra_cost: 12, shipping_cost: 5, seller_id: 'seller-a', deleted_at: null };
  const publicProduct = product.toPublicProduct(dirty, ['https://cdn/x.jpg']);
  for (const key of ['cost', 'extra_cost', 'extraCost', 'shipping_cost', 'seller_id', 'sellerId', 'deleted_at']) assert.equal(key in publicProduct, false, `${key} sızmamalı`);
  assert.equal(JSON.stringify(publicProduct).includes('90'), false);
  for (const field of product.PRIVATE_PRODUCT_FIELDS) assert.equal(product.PUBLIC_PRODUCT_COLUMNS.includes(field), false, `${field} herkese açık sütun listesinde olmamalı`);
});

test('Aşama 1 demo müşteri ürünü (shopProduct) maliyeti taşımaz', () => {
  const shop = { ownerId: 'o', reference: 'R', status: 'onaylandi', products: [], campaigns: [], settings: { storeName: 'Mağaza', description: '', contactEmail: '', contactPhone: '' }, shipping: { shippingFee: 49.9, freeShippingThreshold: 250, preparationDays: 2, carrier: 'X' } };
  const result = demo.shopProduct({ id: 'a', name: 'Ürün', sku: 'S', category: 'Kat', price: 100, cost: 61, stock: 3, costs: { shipping: 7 } }, shop);
  assert.equal(JSON.stringify(result).includes('61'), false);
  assert.equal('cost' in result || 'costs' in result, false);
});

test('Herkese açık katalog sorgusu maliyet tablosuna dokunmaz ve select("*") kullanmaz', () => {
  const file = path.join(root, 'lib/repositories/supabase/catalog.ts');
  assert.ok(fs.existsSync(file), 'catalog.ts bulunmalı');
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(/product_costs/.test(source), false);
  assert.equal(/select\(\s*["'`]\*["'`]/.test(source), false);
  assert.ok(source.includes('PUBLIC_PRODUCT_COLUMNS'));
});

// ─── 3, 9. Sipariş yetkisi ──────────────────────────────────────────────────
test('Başka satıcı siparişi yönetemez / göremez; siparişin varlığı sızdırılmaz', () => {
  const result = orders.checkOrderTransition(SELLER_B, order('new'), 'preparing');
  same(result, { ok: false, code: 'ORDER_NOT_FOUND' });
  assert.equal(orders.canViewOrder(SELLER_B, order()), false);
  assert.equal(orders.checkOrderTransition(SELLER_A, order('new'), 'preparing').ok, true);
  assert.throws(() => orders.assertOrderTransition(SELLER_B, order('new'), 'preparing'), /bulunamadı/);
});

test('Müşteri başka müşterinin siparişini göremez ve iptal edemez', () => {
  assert.equal(orders.canViewOrder(OTHER_BUYER, order()), false);
  assert.equal(orders.checkOrderTransition(OTHER_BUYER, order('new'), 'cancelled').ok, false);
  assert.equal(orders.canViewOrder(BUYER, order()), true);
  assert.equal(orders.canViewOrder(ANON, order()), false);
});

test('Müşteri iptal edebilir ama kargoya veremez / teslim edildi yapamaz', () => {
  assert.equal(orders.checkOrderTransition(BUYER, order('new'), 'cancelled').ok, true);
  same(orders.checkOrderTransition(BUYER, order('preparing'), 'shipped'), { ok: false, code: 'FORBIDDEN' });
  same(orders.checkOrderTransition(BUYER, order('shipped'), 'delivered'), { ok: false, code: 'FORBIDDEN' });
  same(orders.checkOrderTransition(ANON, order('new'), 'cancelled'), { ok: false, code: 'AUTH_REQUIRED' });
});

// ─── 4. Stok asla 0'ın altına düşmez ────────────────────────────────────────
test('Stok hiçbir işlemle 0\'ın altına düşmez', () => {
  assert.throws(() => stock.applyStockChange(3, 'remove', 4), /0'ın altına/);
  assert.equal(stock.applyStockChange(3, 'remove', 3).after, 0);
  assert.throws(() => stock.reserveStock(2, 3), /Stokta 2 adet/);
  for (const bad of [0, -1, 1.5, NaN]) assert.throws(() => stock.reserveStock(10, bad));
  for (const bad of [-1, 1.5, NaN, stock.MAX_STOCK + 1]) assert.throws(() => stock.applyStockChange(5, 'set', bad));
  // Rastgele işlem dizisinde stok asla eksiye inmez.
  let current = 20;
  let seed = 7;
  for (let step = 0; step < 500; step += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const quantity = 1 + (seed % 9);
    const mode = ['add', 'remove', 'remove'][seed % 3];
    try { current = stock.applyStockChange(current, mode, quantity).after; } catch { /* reddedilen işlem stoğu değiştirmez */ }
    assert.ok(current >= 0);
  }
});

test('Stok hareketi önce/sonra değerlerini ve referansı tutar', () => {
  const change = stock.applyStockChange(10, 'remove', 4);
  const movement = stock.buildMovement({ type: 'manual_remove', change, reference: { type: 'manual' }, note: '  sayım farkı ' });
  same({ before: movement.stockBefore, after: movement.stockAfter, change: movement.quantityChange, note: movement.note }, { before: 10, after: 6, change: -4, note: 'sayım farkı' });
  assert.throws(() => stock.buildMovement({ type: 'manual_set', change: stock.applyStockChange(5, 'set', 5) }), /Değişiklik yok/);
  assert.equal(stock.shouldAutoPassive({ totalStock: 0, autoPassive: true, status: 'active' }), true);
  assert.equal(stock.shouldAutoPassive({ totalStock: 0, autoPassive: false, status: 'active' }), false);
  assert.equal(stock.totalVariantStock([{ stock: 3 }, { stock: 4, isActive: false }, { stock: 5 }]), 8);
});

// ─── 5. Aynı sipariş iki kez oluşmaz ────────────────────────────────────────
test('Aynı idempotency anahtarı ikinci kez sipariş oluşturmaz; Aşama 1 aynı sipariş kimliğini de reddeder', () => {
  const keys = new Set(['abc-12345678']);
  assert.equal(orders.isDuplicateCheckout(keys, 'abc-12345678'), true);
  assert.equal(orders.isDuplicateCheckout(keys, 'other-12345678'), false);
  const state = { ...structuredClone(demo.emptyDemo), currentUserId: 'b', users: [{ id: 'b', name: 'B', email: 'b@example.com' }] };
  const catalog = slug => slug === 'x' ? { slug: 'x', name: 'X', price: 10, stock: 5, seller: 'S' } : undefined;
  const details = { address: 'a', billingAddress: 'a', coupon: null, express: false };
  const first = demo.placeDemoOrder(state, [{ lineId: 'x', slug: 'x', quantity: 1 }], catalog, details, 'VP-1').state;
  assert.throws(() => demo.placeDemoOrder(first, [{ lineId: 'x', slug: 'x', quantity: 1 }], catalog, details, 'VP-1'), /zaten/);
});

// ─── 6, 7. İptal ────────────────────────────────────────────────────────────
test('İptal stoğu yalnızca bir kez geri yükler', () => {
  const first = orders.planCancellation({ status: 'new', stockRestoredAt: null }, new Date('2026-01-01T00:00:00Z'));
  assert.equal(first.restoreStock, true);
  // Stok zaten geri yüklenmişse (ör. yarım kalmış işlem yeniden denenirse) ikinci kez yüklenmez.
  const retry = orders.planCancellation({ status: 'preparing', stockRestoredAt: first.stockRestoredAt }, new Date('2026-01-02T00:00:00Z'));
  assert.equal(retry.restoreStock, false);
  assert.equal(retry.stockRestoredAt, first.stockRestoredAt);
  // İptal edilmiş sipariş tekrar iptal edilemez.
  assert.throws(() => orders.planCancellation({ status: 'cancelled', stockRestoredAt: first.stockRestoredAt }), /yapılamaz/);
});

test('Teslim edilmiş sipariş iptal edilemez; iptal edilmiş sipariş yeniden açılamaz', () => {
  assert.equal(orders.isOrderTransitionAllowed('delivered', 'cancelled'), false);
  assert.equal(orders.isOrderTransitionAllowed('shipped', 'cancelled'), false);
  same(orders.checkOrderTransition(SELLER_A, order('delivered'), 'cancelled'), { ok: false, code: 'INVALID_TRANSITION' });
  for (const to of orders.ORDER_STATUSES) assert.equal(orders.isOrderTransitionAllowed('cancelled', to), false);
  assert.throws(() => demo.transitionOrder({ ...structuredClone(demo.emptyDemo), currentUserId: 's', shops: [], orders: [{ id: 'O', buyerId: 'b', createdAt: '2026-01-01', status: 'teslim-edildi', items: [{ slug: 'x', name: 'X', seller: 'S', ownerId: 's', quantity: 1, price: 1 }], address: '', billingAddress: '', subtotal: 1, discount: 0, shipping: 0, total: 1 }] }, 'O', 'iptal-edildi'), /durum/);
});

// ─── 8. Onaysız mağaza / taslak / pasif ürün satılamaz ─────────────────────
test('Onaysız mağaza ve taslak/pasif/silinmiş ürün satılamaz; kendi ürünü alınamaz', () => {
  const active = { sellerId: 's', status: 'active', deletedAt: null, stock: 5 };
  same(orders.checkPurchase({ buyerId: 'b', product: active, storeActive: false, quantity: 1 }), { ok: false, code: 'STORE_INACTIVE' });
  for (const status of ['draft', 'passive']) same(orders.checkPurchase({ buyerId: 'b', product: { ...active, status }, storeActive: true, quantity: 1 }), { ok: false, code: 'NOT_SELLABLE' });
  same(orders.checkPurchase({ buyerId: 'b', product: { ...active, deletedAt: '2026-01-01' }, storeActive: true, quantity: 1 }), { ok: false, code: 'NOT_SELLABLE' });
  same(orders.checkPurchase({ buyerId: 's', product: active, storeActive: true, quantity: 1 }), { ok: false, code: 'OWN_PRODUCT' });
  same(orders.checkPurchase({ buyerId: null, product: active, storeActive: true, quantity: 1 }), { ok: false, code: 'AUTH_REQUIRED' });
  same(orders.checkPurchase({ buyerId: 'b', product: active, storeActive: true, quantity: 6 }), { ok: false, code: 'OUT_OF_STOCK' });
  same(orders.checkPurchase({ buyerId: 'b', product: active, storeActive: true, quantity: 5 }), { ok: true });
  assert.equal(product.isProductSellable({ status: 'active', deletedAt: null }, true), true);
  assert.equal(product.isProductSellable({ status: 'active', deletedAt: null }, false), false);
});

test('Sepet satırları: negatif, kesirli, sıfır, NaN ve boş sepet reddedilir', () => {
  for (const quantity of [-1, 0, 1.5, NaN, 100]) assert.throws(() => orders.validateOrderLines([{ productId: 'p', quantity }]), /adedi/);
  assert.throws(() => orders.validateOrderLines([]), /boş/);
  assert.doesNotThrow(() => orders.validateOrderLines([{ productId: 'p', quantity: 99 }]));
});

// ─── 10. Favoriler ──────────────────────────────────────────────────────────
test('Aynı ürün favorilere iki kez eklenemez', () => {
  const once = favorites.addFavoriteSlug([], 'demo-1');
  same(favorites.addFavoriteSlug(once, 'demo-1'), ['demo-1']);
  assert.equal(favorites.isFavoriteDuplicate(once, ' demo-1 '), true);
  same(favorites.removeFavoriteSlug(once, 'demo-1'), []);
  assert.throws(() => favorites.addFavoriteSlug([], '   '), /geçersiz/);
});

// ─── 11. Soru–cevap yetkisi ─────────────────────────────────────────────────
test('Soru–cevap: yalnızca mağaza sahibi yanıtlar, yalnızca yanıtlanan soru herkese açıktır, hız sınırı vardır', () => {
  assert.equal(questions.canAnswerQuestion(SELLER_B, { storeOwnerId: SELLER_A.id }), false);
  assert.equal(questions.canAnswerQuestion(BUYER, { storeOwnerId: SELLER_A.id }), false);
  assert.equal(questions.canAnswerQuestion(SELLER_A, { storeOwnerId: SELLER_A.id }), true);
  assert.equal(questions.canAnswerQuestion(ANON, { storeOwnerId: SELLER_A.id }), false);
  same(questions.checkAskQuestion(ANON, { sellerId: 's', sellable: true }), { ok: false, code: 'AUTH_REQUIRED' });
  same(questions.checkAskQuestion(SELLER_A, { sellerId: SELLER_A.id, sellable: true }), { ok: false, code: 'OWN_PRODUCT' });
  same(questions.checkAskQuestion(BUYER, { sellerId: 's', sellable: false }), { ok: false, code: 'PRODUCT_NOT_FOUND' });
  assert.equal(questions.isQuestionPublic('pending'), false);
  assert.equal(questions.isQuestionPublic('hidden'), false);
  assert.equal(questions.isQuestionPublic('answered'), true);
  assert.equal(questions.isQuestionRateLimited({ askedLastHour: 5, pendingForProduct: 0 }), true);
  assert.equal(questions.isQuestionRateLimited({ askedLastHour: 0, pendingForProduct: 2 }), true);
  assert.equal(questions.isQuestionRateLimited({ askedLastHour: 4, pendingForProduct: 1 }), false);
  assert.throws(() => questions.validateQuestionText('abc'), /5–500/);
  assert.equal(questions.maskDisplayName('Ayşe Yılmaz'), 'A*** Y.');
  assert.equal(questions.maskDisplayName(''), 'Müşteri');
});

// ─── 12. İade yetkisi ───────────────────────────────────────────────────────
test('İade: müşteri onaylayamaz, başka satıcı göremez, müşteri yalnızca kargoya verdim diyebilir', () => {
  const ret = status => ({ buyerId: BUYER.id, sellerId: SELLER_A.id, status });
  same(returns.checkReturnTransition(BUYER, ret('requested'), 'approved'), { ok: false, code: 'FORBIDDEN' });
  same(returns.checkReturnTransition(SELLER_B, ret('requested'), 'approved'), { ok: false, code: 'RETURN_NOT_FOUND' });
  same(returns.checkReturnTransition(OTHER_BUYER, ret('requested'), 'approved'), { ok: false, code: 'RETURN_NOT_FOUND' });
  assert.equal(returns.checkReturnTransition(SELLER_A, ret('requested'), 'approved').ok, true);
  assert.equal(returns.checkReturnTransition(BUYER, ret('approved'), 'shipped').ok, true);
  same(returns.checkReturnTransition(SELLER_A, ret('approved'), 'shipped'), { ok: false, code: 'FORBIDDEN' });
  assert.equal(returns.checkReturnTransition(SELLER_A, ret('shipped'), 'received').ok, true);
  assert.equal(returns.checkReturnTransition(SELLER_A, ret('received'), 'refunded').ok, true);
  same(returns.checkReturnTransition(SELLER_A, ret('requested'), 'refunded'), { ok: false, code: 'INVALID_TRANSITION' });
  assert.throws(() => returns.assertReturnTransition(SELLER_A, ret('requested'), 'rejected', ''), /Ret nedenini/);
});

test('İade talebi: yalnızca teslim edilmiş, süresi içinde, kalan adet kadar', () => {
  const item = { orderStatus: 'delivered', deliveredAt: '2026-01-01T10:00:00Z', itemQuantity: 3, alreadyRequested: 1, unitPrice: 99.99, buyerId: BUYER.id };
  const within = new Date('2026-01-10T10:00:00Z');
  same(returns.checkReturnRequest(BUYER.id, item, 2, within), { ok: true, refundAmount: 199.98 });
  assert.equal(returns.checkReturnRequest(BUYER.id, item, 3, within).code, 'INVALID_QUANTITY');
  assert.equal(returns.checkReturnRequest(BUYER.id, item, 0, within).code, 'INVALID_QUANTITY');
  assert.equal(returns.checkReturnRequest(BUYER.id, item, 1, new Date('2026-01-16T10:00:01Z')).code, 'RETURN_WINDOW');
  assert.equal(returns.checkReturnRequest(BUYER.id, { ...item, orderStatus: 'shipped' }, 1, within).code, 'NOT_DELIVERED');
  assert.equal(returns.checkReturnRequest(OTHER_BUYER.id, item, 1, within).code, 'ITEM_NOT_FOUND');
  assert.equal(returns.checkReturnRequest(null, item, 1, within).code, 'AUTH_REQUIRED');
});

// ─── 13. Paket ürün limiti ──────────────────────────────────────────────────
test('Paket ürün limiti lib/plans.ts kaynağından uygulanır (Enterprise sınırsız)', () => {
  const limit = plans.plans['vitrin'].productLimit;
  assert.equal(product.checkPlanProductLimit('vitrin', limit - 1).ok, true);
  assert.equal(product.checkPlanProductLimit('vitrin', limit).ok, false);
  assert.equal(product.checkPlanProductLimit('vitrin', limit - 5, 6).ok, false);
  assert.equal(product.checkPlanProductLimit('vitrin-plus', plans.plans['vitrin-plus'].productLimit - 1).ok, true);
  assert.equal(product.checkPlanProductLimit('vitrin-enterprise', 1_000_000).ok, true);
  assert.equal(product.checkPlanProductLimit('vitrin', 90).remaining, limit - 90);
});

test('SQL plan_limits tohumu lib/plans.ts ile aynıdır', () => {
  const block = foundation.match(/insert into public\.plan_limits[\s\S]*?;/)[0];
  const seeded = Object.fromEntries([...block.matchAll(/\('([a-z-]+)',\s*(\d+|null)\)/g)].map(match => [match[1], match[2] === 'null' ? null : Number(match[2])]));
  for (const key of plans.PLAN_ORDER) assert.equal(seeded[key], plans.plans[key].productLimit, `${key} limiti`);
  assert.equal(Object.keys(seeded).length, plans.PLAN_ORDER.length);
});

// ─── 14. İndirim tarih aralığı ──────────────────────────────────────────────
test('İndirimli fiyat yalnızca tarih aralığında ve geçerli fiyatta uygulanır', () => {
  const base = { price: 100, discountPrice: 80, discountStart: '2026-03-01T00:00:00Z', discountEnd: '2026-03-10T23:59:59Z' };
  assert.equal(product.effectivePrice(base, new Date('2026-02-28T12:00:00Z')), 100);
  assert.equal(product.effectivePrice(base, new Date('2026-03-05T12:00:00Z')), 80);
  assert.equal(product.effectivePrice(base, new Date('2026-03-11T00:00:00Z')), 100);
  assert.equal(product.effectivePrice({ ...base, discountStart: null, discountEnd: null }, new Date('2030-01-01')), 80);
  for (const discountPrice of [100, 120, 0, -5, null, NaN]) assert.equal(product.isDiscountActive({ ...base, discountPrice }, new Date('2026-03-05T12:00:00Z')), false);
  const publicRow = { id: 'p', store_id: 's', name: 'N', sku: 'S', brand: null, model: null, category: 'K', short_description: '', description: '', price: 100, discount_price: 80, discount_start: base.discountStart, discount_end: base.discountEnd, stock: 1 };
  same([product.toPublicProduct(publicRow, [], new Date('2026-03-05T12:00:00Z')).price, product.toPublicProduct(publicRow, [], new Date('2026-03-05T12:00:00Z')).oldPrice], [80, 100]);
  assert.equal(product.toPublicProduct(publicRow, [], new Date('2026-04-01T00:00:00Z')).oldPrice, null);
});

test('Ürün doğrulaması: yayındaki ürün fiyat, SKU ve kategori ister; taslak ister etmez', () => {
  const draft = { name: 'Ürün', sku: '', category: '', price: 0, discountPrice: null, stock: 0, lowStockThreshold: 5, status: 'draft' };
  same(product.validateProductDraft(draft), []);
  assert.equal(product.validateProductDraft({ ...draft, status: 'active' }).length, 3);
  assert.ok(product.validateProductDraft({ ...draft, price: 10, discountPrice: 10 }).length > 0);
  assert.ok(product.validateProductDraft({ ...draft, stock: -1 }).length > 0);
  assert.ok(product.validateProductDraft({ ...draft, imageCount: 11 }).length > 0);
});

// ─── SQL ↔ TS parity ────────────────────────────────────────────────────────
function parseGraph(fnName) {
  const body = functions.match(new RegExp(`function public\\.${fnName}[\\s\\S]*?\\$\\$;`))[0];
  const graph = {};
  for (const match of body.matchAll(/when '([a-z_]+)' then p_to (?:in \(([^)]*)\)|= '([a-z_]+)')/g)) {
    graph[match[1]] = match[2] ? [...match[2].matchAll(/'([a-z_]+)'/g)].map(item => item[1]) : [match[3]];
  }
  return graph;
}
const normalize = graph => Object.fromEntries(Object.entries(graph).filter(([, targets]) => targets.length).map(([from, targets]) => [from, [...targets].sort()]));

test('Sipariş durum grafiği TS ile SQL (order_transition_allowed) arasında birebir aynıdır', () => {
  same(normalize(orders.ORDER_TRANSITIONS), normalize(parseGraph('order_transition_allowed')));
});

test('İade durum grafiği TS ile SQL (return_transition_allowed) arasında birebir aynıdır', () => {
  same(normalize(returns.RETURN_TRANSITIONS), normalize(parseGraph('return_transition_allowed')));
});

test('Aşama 1 demo sipariş geçişleri, TS sipariş grafiğinin (ready_to_ship hariç) alt kümesidir', () => {
  const demoGraph = { alindi: ['hazirlaniyor', 'iptal-edildi'], hazirlaniyor: ['kargoda', 'iptal-edildi'], kargoda: ['teslim-edildi'], 'teslim-edildi': [], 'iptal-edildi': [] };
  for (const [from, targets] of Object.entries(demoGraph)) for (const to of targets) {
    assert.equal(orders.isOrderTransitionAllowed(Object.entries(orders.demoToDbStatus).find(([demoName]) => demoName === from)[1], orders.demoToDbStatus[to]), true, `${from} → ${to}`);
  }
  assert.equal(new Set(Object.values(orders.demoToDbStatus)).size, 5);
});

test('SQL sabitleri: komisyon %0, bekleme 14 gün, iade süresi 14 gün, stok üst sınırı', () => {
  assert.match(foundation, /\('commission', 'VitrinPlus Satış Komisyonu', 0, 10\)/);
  assert.match(foundation, /\('payment_provider', 'Ödeme Altyapısı Kesintisi', 0, 20\)/);
  assert.match(foundation, /function public\.payout_hold_days\(\)[\s\S]*?select 14;/);
  assert.match(foundation, /function public\.return_window_days\(\)[\s\S]*?select 14;/);
  assert.equal(ledger.PAYOUT_HOLD_DAYS, 14);
  assert.equal(returns.RETURN_WINDOW_DAYS, 14);
  assert.match(functions, new RegExp(`p_quantity > ${stock.MAX_STOCK}`));
  assert.equal(ledger.DEFAULT_FEE_RULES.find(rule => rule.code === 'commission').rate, 0);
  assert.equal(plans.COMMISSION_RATE, 0);
});

// ─── Finans ─────────────────────────────────────────────────────────────────
test('Hakediş: net = brüt − indirim + kargo − kesinti; komisyon 0 TL; iade negatif kayıt', () => {
  const sale = ledger.computeSaleEntry({ listTotal: 1000, subtotal: 900, shipping: 49.9 });
  same([sale.gross, sale.discount, sale.shipping, sale.deductionTotal, sale.net], [1000, 100, 49.9, 0, 949.9]);
  assert.equal(sale.deductions.find(item => item.type === 'commission').amount, 0);
  assert.equal(sale.deductions.find(item => item.type === 'commission').label, 'VitrinPlus Satış Komisyonu');
  // Kesinti kuralı eklenince kod değişmeden yeni satır oluşur (genişletilebilir).
  const extended = ledger.computeSaleEntry({ listTotal: 100, subtotal: 100, shipping: 0, rules: [...ledger.DEFAULT_FEE_RULES, { code: 'campaign', label: 'Kampanya Katkısı', rate: 0.02, sortOrder: 30 }] });
  assert.equal(extended.deductionTotal, 2);
  assert.equal(extended.net, 98);
  const refund = ledger.computeReturnEntry(120.5);
  same([refund.gross, refund.net], [-120.5, -120.5]);
});

test('Hakediş özeti: bekleyen / ödemeye hazır / planlanan / ödenen bakiyeler doğru ayrılır', () => {
  const now = new Date('2026-06-30T00:00:00Z');
  const entry = overrides => ({ entryType: 'sale', status: 'pending', gross: 100, discount: 0, shipping: 0, deductions: [{ type: 'commission', label: 'VitrinPlus Satış Komisyonu', rate: 0, amount: 0 }], net: 100, availableAt: null, payoutId: null, ...overrides });
  const summary = ledger.summarizeLedger([
    entry({}), // teslim edilmedi → bekleyen
    entry({ availableAt: '2026-06-01T00:00:00Z' }), // ödemeye hazır
    entry({ availableAt: '2026-06-01T00:00:00Z', payoutId: 'po-1' }), // planlanan
    entry({ status: 'paid', availableAt: '2026-05-01T00:00:00Z' }), // ödenen
    entry({ status: 'reversed' }), // iptal → sayılmaz
    entry({ entryType: 'return', gross: -40, net: -40, availableAt: '2026-06-20T00:00:00Z' }),
  ], now);
  same([summary.pendingBalance, summary.availableBalance, summary.plannedBalance, summary.paidTotal], [100, 60, 100, 100]);
  assert.equal(summary.returns, 40);
  assert.equal(summary.commission, 0);
  assert.equal(summary.net, 360);
});

test('Ödeme durum grafiği: ödendi/başarısız/iptal son durumdur', () => {
  assert.equal(ledger.isPayoutTransitionAllowed('planned', 'paid'), true);
  assert.equal(ledger.isPayoutTransitionAllowed('paid', 'planned'), false);
  assert.equal(ledger.isPayoutTransitionAllowed('failed', 'paid'), false);
  assert.equal(ledger.payoutAvailableAt(new Date('2026-01-01T00:00:00Z')).toISOString(), '2026-01-15T00:00:00.000Z');
});

test('Sipariş toplamı: kupon, ücretsiz kargo eşiği ve hızlı kargo SQL ile aynı hesaplanır', () => {
  const shipping = { shippingFee: 49.9, freeShippingThreshold: 250 };
  same(orders.quoteStoreOrder(100, shipping), { subtotal: 100, discount: 0, shipping: 49.9, total: 149.9 });
  same(orders.quoteStoreOrder(250, shipping), { subtotal: 250, discount: 0, shipping: 0, total: 250 });
  same(orders.quoteStoreOrder(260, shipping, { coupon: 'vitrinplus10' }), { subtotal: 260, discount: 26, shipping: 49.9, total: 283.9 });
  assert.equal(orders.quoteStoreOrder(100, shipping, { express: true }).shipping, 79.8);
  assert.equal(orders.quoteStoreOrder(100, shipping, { coupon: 'YANLIS' }).discount, 0);
});

// ─── Hata mesajları, ortam, yönlendirme, başvuru ────────────────────────────
test('Ham veritabanı hataları kullanıcıya sızmaz; RPC Türkçe mesajları gösterilir', () => {
  assert.equal(errors.friendlyError({ code: 'P0001', message: 'Stokta 2 adet var.', hint: 'OUT_OF_STOCK' }), 'Stokta 2 adet var.');
  assert.equal(errors.friendlyError({ code: '42501', message: 'new row violates row-level security policy for table "products"' }), errors.FORBIDDEN_ERROR);
  assert.equal(errors.friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "products_sku_uq"' }), 'Bu kayıt zaten mevcut.');
  assert.equal(errors.friendlyError({ code: 'PGRST301', message: 'JWT expired' }), errors.SESSION_ERROR);
  assert.equal(errors.friendlyError(Object.assign(new TypeError('Failed to fetch'), {})), errors.NETWORK_ERROR);
  assert.equal(errors.friendlyError(new errors.MarketplaceError('X', 'Merhaba')), 'Merhaba');
  assert.equal(errors.friendlyError(undefined), errors.GENERIC_ERROR);
  assert.equal(errors.friendlyError({ code: '42P01', message: 'relation "secret_table" does not exist' }), errors.GENERIC_ERROR);
  assert.equal(errors.errorCode({ code: 'P0001', hint: 'RATE_LIMIT' }), 'RATE_LIMIT');
});

function fakeJwt(role) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role, iss: 'supabase' })}.imza`;
}
test('Ortam doğrulaması: service_role / secret anahtarı tarayıcı yapılandırmasına kabul edilmez', () => {
  const url = 'https://abcd.supabase.co';
  assert.equal(env.validatePublicConfig(url, fakeJwt('anon')).ok, true);
  assert.equal(env.validatePublicConfig(url, 'sb_publishable_abc123').ok, true);
  assert.equal(env.validatePublicConfig(url, fakeJwt('service_role')).reason, 'secret-key');
  assert.equal(env.validatePublicConfig(url, 'sb_secret_abc123').reason, 'secret-key');
  assert.equal(env.validatePublicConfig(url, 'rastgele').reason, 'invalid-key');
  assert.equal(env.validatePublicConfig('http://evil.example.com', fakeJwt('anon')).reason, 'invalid-url');
  assert.equal(env.validatePublicConfig('http://localhost:54321', fakeJwt('anon')).ok, true);
  assert.equal(env.validatePublicConfig('', '').reason, 'missing');
  assert.equal(env.validatePublicConfig(undefined, undefined).reason, 'missing');
  assert.equal(env.describeConfigProblem({ ok: false, reason: 'missing' }), null);
  assert.match(env.describeConfigProblem({ ok: false, reason: 'secret-key' }), /gizli/);
});

test('Kaynak kodda sabit Supabase anahtarı yok; service-role yalnızca sunucu modülünde okunur', () => {
  const offenders = [];
  const scan = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (!['node_modules', '.next', '.git'].includes(entry.name)) scan(relative); continue; }
      if (!/\.(ts|tsx|mjs|json|md)$/.test(entry.name) || entry.name === 'package-lock.json') continue;
      const text = fs.readFileSync(path.join(root, relative), 'utf8');
      if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./.test(text) && !relative.endsWith('domain.test.mjs')) offenders.push(`${relative}: JWT benzeri anahtar`);
      if (/sb_(secret|publishable)_[A-Za-z0-9]{10,}/.test(text)) offenders.push(`${relative}: sb_ anahtarı`);
      if (text.includes('SUPABASE_SERVICE_ROLE_KEY') && !/^(lib[\\/]supabase[\\/]admin\.ts|lib[\\/]supabase[\\/]env\.ts|\.env\.example)$/.test(relative) && !/\.(md|mjs)$/.test(entry.name)) offenders.push(`${relative}: service-role anahtarı adı`);
    }
  };
  for (const dir of ['app', 'components', 'lib', 'types']) scan(dir);
  same(offenders, []);
  assert.ok(fs.readFileSync(path.join(root, 'lib/supabase/admin.ts'), 'utf8').startsWith('import "server-only"'));
  assert.equal(/NEXT_PUBLIC_SUPABASE_SERVICE/.test(fs.readFileSync(path.join(root, '.env.example'), 'utf8')), false);
});

test('Rota koruması: satıcı paneli seller/admin, yönetim yalnızca admin; giriş yoksa girişe yönlenir', () => {
  assert.equal(paths.canAccessRoute('customer', '/satici-panel/urunler'), false);
  assert.equal(paths.canAccessRoute(null, '/satici-panel'), false);
  assert.equal(paths.canAccessRoute('seller', '/satici-panel/urunler'), true);
  assert.equal(paths.canAccessRoute('seller', '/yonetim'), false);
  assert.equal(paths.canAccessRoute('admin', '/yonetim/basvurular'), true);
  assert.equal(paths.canAccessRoute('customer', '/hesabim'), true);
  assert.equal(paths.canAccessRoute('customer', '/satici-paneli-degil'), true);
  assert.equal(paths.redirectTargetFor(null, false, '/satici-panel/siparisler', '?durum=yeni'), '/giris?next=%2Fsatici-panel%2Fsiparisler%3Fdurum%3Dyeni');
  assert.equal(paths.redirectTargetFor('customer', true, '/satici-panel'), '/satici-basvuru/durum');
  assert.equal(paths.redirectTargetFor('seller', true, '/yonetim'), '/hesabim');
  assert.equal(paths.redirectTargetFor('seller', true, '/satici-panel'), null);
  assert.equal(paths.redirectTargetFor(null, false, '/'), null);
});

test('Giriş sonrası yönlendirme yalnızca uygulama içi yollara izin verir (open-redirect)', () => {
  for (const evil of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/a\r\nb', '']) assert.equal(paths.safeNextPath(evil), '/hesabim', evil);
  assert.equal(paths.safeNextPath('/satici-panel/urunler?x=1'), '/satici-panel/urunler?x=1');
  assert.equal(paths.safeNextPath(null, '/'), '/');
});

test('Satıcı başvurusu veritabanına giderken şifre, TC kimlik, doğum tarihi ve tam IBAN içermez', () => {
  const data = {
    sellerType: 'sahis', status: 'taslak', applicationId: null, invoicePreference: 'kendi-sistemim', planId: 'vitrin-plus',
    account: { ad: 'Ayşe', soyad: 'Yılmaz', email: 'a@example.com', telefon: '05320000000', tcKimlikNo: '11111111110', dogumTarihi: '1990-01-01', sifre: 'GizliSifre123!', sifreTekrar: 'GizliSifre123!' },
    business: { ticariUnvan: 'AY', vergiDairesi: 'Kadıköy', vergiNumarasi: '1234567890', isletmeAdresi: 'Adres 1', il: 'İstanbul', ilce: 'Kadıköy', sirketUnvani: '', mersisNumarasi: '', ticaretSicilNumarasi: '', yetkiliKisi: '', sirketAdresi: '' },
    bank: { iban: 'TR33 0006 1005 1978 6457 8413 26', bankaAdi: 'Banka', hesapSahibiAdi: 'Ayşe Yılmaz' },
    shipping: { il: 'İstanbul', ilce: 'Kadıköy', acikAdres: 'Adres', iadeAdresiAyni: true, iadeIl: '', iadeIlce: '', iadeAcikAdres: '' },
    store: { magazaAdi: 'Deneme Mağaza', magazaSlug: 'deneme', aciklama: 'Açıklama', logo: null, kapakGorseli: null, anaKategoriler: ['Moda'] },
    documents: { kimlik: { name: 'kimlik.pdf', size: 100, type: 'application/pdf', uploadedAt: '2026-01-01' } },
    agreement: { sozlesmeKabul: true, kvkkKabul: true, ticariIletiKabul: false },
  };
  const clean = application.sanitizeApplication(data);
  const json = JSON.stringify(clean);
  for (const secret of ['GizliSifre123!', '11111111110', '1990-01-01', '0006 1005 1978', '00061005197864578413']) assert.equal(json.includes(secret), false, `${secret} sızmamalı`);
  assert.equal(clean.bank.ibanMasked.endsWith('1326'), true);
  assert.equal(clean.store.name, 'Deneme Mağaza');
  same(Object.keys(clean.documents), ['kimlik']);
  assert.equal(application.maskIban('kısa'), '');
});

test('Sunucu yetkisi RPC/RLS ile uygulanır: müşteri modeli ve yazma yolları sözleşmesi (SQL metni)', () => {
  const grants = sql('0005_rls_and_grants.sql');
  // Doğrudan stok yazımı yok: products güncelleme yetkisi listesinde "stock" bulunmaz.
  const updateGrant = grants.match(/grant update \(([^)]*)\)\s*on public\.products/)[1];
  assert.equal(/\bstock\b/.test(updateGrant), false);
  assert.equal(/\bstatus\b/.test(updateGrant), true);
  // Maliyet ayrı tabloda; herkese açık ürün select'inde maliyet sütunu yoktur.
  assert.match(grants, /grant select on public\.products to anon, authenticated/);
  assert.match(sql('0002_catalog.sql'), /create table public\.product_costs/);
  assert.equal(/\bcost\b/.test(sql('0002_catalog.sql').match(/create table public\.products \([\s\S]*?\n\);/)[0].replace(/product_costs/g, '')), false);
  // Tüm tablolarda RLS açık.
  const tables = [...['0001_foundation.sql', '0002_catalog.sql', '0003_operations.sql'].map(sql).join('\n').matchAll(/create table public\.([a-z_]+)/g)].map(match => match[1]);
  for (const table of tables) assert.match(grants, new RegExp(`alter table public\\.${table}\\s+enable row level security`), `${table} RLS`);
});

// ─── Hesap: adres / profil / bildirim tercihleri ────────────────────────────
const goodAddress = { title: 'Ev', fullName: 'Ayşe Yılmaz', phone: '+90 532 111 22 33', city: 'İstanbul', district: 'Kadıköy', addressLine: 'Moda Cad. No:5 D:3', postalCode: '34710' };

test('Adres doğrulaması: geçerli adres kabul edilir; eksik / bozuk alanlar Türkçe hata verir', () => {
  same(account.validateAddress(goodAddress), []);
  assert.equal(account.validateAddress({ ...goodAddress, phone: 'abc' }).length, 1);
  assert.equal(account.validateAddress({ ...goodAddress, addressLine: 'x' }).length, 1);
  assert.equal(account.validateAddress({ ...goodAddress, title: '   ', city: '' }).length, 2);
  assert.throws(() => account.assertValidAddress({ ...goodAddress, fullName: '' }), (error) => error.code === 'INVALID_ADDRESS' && /Ad soyad/.test(error.message));
  assert.equal(account.MAX_ADDRESSES, 10);
  // SQL sınırı ile aynı: adres tablosunda telefon deseni ve uzunluk kısıtı bulunur.
  assert.match(sql('0002_catalog.sql'), /create table public\.addresses/);
});

test('Profil alanları ve bildirim tercihleri güvenle normalleştirilir', () => {
  same(account.validateProfileFields({ fullName: 'Ayşe', phone: '' }), []);
  assert.equal(account.validateProfileFields({ fullName: 'A' }).length, 1);
  assert.equal(account.validateProfileFields({ phone: '12' }).length, 1);
  const prefs = account.normalizeNotificationPrefs({ orderUpdates: false, promotions: 'evet', bilinmeyen: true });
  assert.equal(prefs.orderUpdates, false);
  assert.equal(prefs.promotions, false); // boolean olmayan değer yok sayılır → varsayılan
  assert.equal('bilinmeyen' in prefs, false);
  same(account.normalizeNotificationPrefs(null), JSON.parse(JSON.stringify(account.DEFAULT_NOTIFICATION_PREFS)));
});

// ─── Görsel yükleme doğrulaması ─────────────────────────────────────────────
test('Görsel yükleme: yalnızca jpeg/png/webp, boyut sınırı, güvenli yol; SQL bucket sınırlarıyla aynı', () => {
  assert.equal(storageValidate.validateImage({ type: 'image/jpeg', size: 1000 }, 'product-images'), 'jpg');
  assert.equal(storageValidate.validateImage({ type: 'image/webp', size: 1000 }, 'avatars'), 'webp');
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', 'text/html', '']) assert.throws(() => storageValidate.validateImage({ type, size: 100 }, 'product-images'), (e) => e.code === 'INVALID_IMAGE_TYPE');
  assert.throws(() => storageValidate.validateImage({ type: 'image/png', size: 0 }, 'product-images'), (e) => e.code === 'INVALID_IMAGE');
  assert.throws(() => storageValidate.validateImage({ type: 'image/png', size: 5_242_881 }, 'product-images'), (e) => e.code === 'IMAGE_TOO_LARGE');
  assert.throws(() => storageValidate.validateImage({ type: 'image/png', size: 2_097_153 }, 'avatars'), (e) => e.code === 'IMAGE_TOO_LARGE');
  const storageSql = sql('0006_storage.sql');
  assert.match(storageSql, new RegExp(`'product-images'[^)]*${storageValidate.BUCKET_MAX_BYTES['product-images']}`));
  assert.match(storageSql, new RegExp(`'avatars'[^)]*${storageValidate.BUCKET_MAX_BYTES.avatars}`));
  assert.equal(storageValidate.buildObjectPath(['store-1', 'prod-1'], 'abc', 'jpg'), 'store-1/prod-1/abc.jpg');
  assert.throws(() => storageValidate.buildObjectPath(['..', 'x'], 'abc', 'jpg'), (e) => e.code === 'INVALID_PATH');
  assert.equal(storageValidate.buildObjectPath(['a/../b'], 'id', 'png'), 'ab/id.png'); // yol ayırıcılar temizlenir
  assert.equal(storageValidate.storagePathFromPublicUrl('https://x.supabase.co/storage/v1/object/public/product-images/s/p/i.jpg?t=1', 'product-images'), 's/p/i.jpg');
  assert.equal(storageValidate.storagePathFromPublicUrl('https://baska.com/x.jpg', 'product-images'), null);
  assert.equal(storageValidate.parseDataUrl('data:image/png;base64,iVBORw0KGgo=').mime, 'image/png');
  assert.equal(storageValidate.parseDataUrl('data:image/png,ham-veri'), null);
});

// ─── Satıcı paneli → veritabanı değişiklik planı ────────────────────────────
const shopOf = (products) => ({ ownerId: 'u1', reference: 'VP-1', status: 'onaylandi', products, campaigns: [], settings: { storeName: 'Mağaza', description: '', contactEmail: 'a@b.co', contactPhone: '' }, shipping: { shippingFee: 49.9, freeShippingThreshold: 250, preparationDays: 2, carrier: 'Kargo' } });
const baseProduct = { id: 'p1', name: 'Kulaklık', sku: 'K-1', category: 'Ses', price: 200, cost: 90, stock: 10, status: 'aktif', images: ['a', 'b'] };

test('Değişiklik planı: sadece değişen alanlar yazılır, maliyet ayrı tabloya gider, örnek veri sunucuya yazılmaz', () => {
  const before = shopOf([baseProduct]);
  assert.equal(shopDiff.isEmptyPlan(shopDiff.planShopChanges(before, shopOf([{ ...baseProduct }]))), true);

  const priced = shopDiff.planShopChanges(before, shopOf([{ ...baseProduct, price: 250 }]));
  same(priced.productsUpdated[0].patch, { price: 250 });
  assert.equal(priced.productsUpdated[0].costs, null);

  const costChange = shopDiff.planShopChanges(before, shopOf([{ ...baseProduct, cost: 95 }])).productsUpdated[0];
  assert.equal(Object.keys(costChange.patch).some((key) => key.includes('cost')), false, 'maliyet ürün tablosuna yazılmaz');
  assert.equal(costChange.costs.cost, 95);

  const stockChange = shopDiff.planShopChanges(before, shopOf([{ ...baseProduct, stock: 7 }])).productsUpdated[0];
  same(stockChange.stock, { from: 10, to: 7 });
  assert.equal('stock' in stockChange.patch, false, 'stok doğrudan sütun olarak yazılmaz (adjust_stock RPC)');

  const images = shopDiff.planShopChanges(before, shopOf([{ ...baseProduct, images: ['b', 'c'] }])).productsUpdated[0];
  same([images.imagesAdded, images.imagesRemoved, images.imageOrder], [['c'], ['a'], ['b', 'c']]);

  const withSample = shopDiff.planShopChanges(before, shopOf([baseProduct, { ...baseProduct, id: 'p2', sample: true }, { ...baseProduct, id: 'p3' }]));
  same(withSample.productsAdded.map((p) => p.id), ['p3']);
  same(shopDiff.planShopChanges(before, shopOf([])).productsRemoved, ['p1']);
});

test('Değişiklik planı: varyant stoku ve indirim tarihi doğru üretilir', () => {
  const before = shopOf([{ ...baseProduct, stock: 5, variants: [{ id: 'v1', label: 'S', stock: 2 }, { id: 'v2', label: 'M', stock: 3 }] }]);
  const after = shopOf([{ ...baseProduct, stock: 5, variants: [{ id: 'v1', label: 'S', stock: 4 }, { id: 'v3', label: 'L', stock: 1 }] }]);
  const update = shopDiff.planShopChanges(before, after).productsUpdated[0];
  same(update.variantStock, [{ variantId: 'v1', from: 2, to: 4 }]);
  same(update.variantsRemoved, ['v2']);
  same(update.variantsAdded.map((v) => v.id), ['v3']);
  assert.equal(update.stock, null, 'varyantlı üründe toplam stok varyantlardan türer');
  // İndirimli fiyat listeden büyük / eşitse gönderilmez (veritabanı kısıtı).
  assert.equal(shopDiff.dbDiscountPrice({ price: 100, salePrice: 100 }), null);
  assert.equal(shopDiff.dbDiscountPrice({ price: 100, salePrice: 80 }), 80);
});

// ─── Veritabanı satırı → arayüz modeli ──────────────────────────────────────
test('Eşleyiciler: ürün slug\'ı, mağaza durumu, sipariş kimliği ve müşteri ürününde maliyet yok', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(mappers.productSlugFor(id), `demo-${id}`);
  assert.equal(mappers.idFromProductSlug(`demo-${id}`), id);
  for (const bad of ['demo-1', 'urun-x', `x-${id}`, '', 'demo-']) assert.equal(mappers.idFromProductSlug(bad), null);
  assert.equal(mappers.sellerStatusToShopStatus('approved'), 'onaylandi');
  assert.equal(mappers.sellerStatusToShopStatus('pending'), 'bekliyor');
  assert.equal(mappers.sellerStatusToShopStatus('suspended'), 'reddedildi');

  const customerView = mappers.mapPublicProduct({ id, name: 'Kulaklık', sku: 'K1', brand: null, model: null, category: 'Ses', shortDescription: '', description: 'Güzel', price: 150, oldPrice: 200, stock: 3, images: ['https://cdn/a.jpg'] }, { name: 'Mağaza', description: '' });
  assert.equal(customerView.slug, `demo-${id}`);
  assert.equal(customerView.discount, 25);
  assert.equal(customerView.seller, 'Mağaza');
  assert.equal(/cost|maliyet/i.test(JSON.stringify(customerView)), false);

  const row = { id: 'o1', order_no: 'VP-ABC12345', buyer_id: 'b1', status: 'delivered', created_at: '2026-01-01T00:00:00Z', delivered_at: '2026-01-05T00:00:00Z', shipping_address: 'Adres', billing_address: 'Fatura', subtotal: '200.00', discount_total: '0', shipping_total: '49.90', total: '249.90' };
  const item = { id: 'i1', product_id: id, product_name: 'Kulaklık', variant_label: 'Siyah', quantity: 1, unit_price: '200.00', seller_id: 's1' };
  const mapped = mappers.mapOrder(row, [item], 'Mağaza');
  assert.equal(mapped.id, 'VP-ABC12345');
  assert.equal(mapped.status, 'teslim-edildi');
  assert.equal(mapped.deliveredAt, '2026-01-05T00:00:00Z');
  assert.equal(mapped.total, 249.9);
  assert.equal(mapped.items[0].slug, `demo-${id}`);
});

// ─── Servis katmanı ─────────────────────────────────────────────────────────
test('Servisler: ham veritabanı hatası kullanıcıya sızmaz; doğrulama depo çağrısından ÖNCE yapılır', async () => {
  await assert.rejects(services.guarded(async () => { throw { code: '42501', message: 'new row violates row-level security policy for table "products"' }; }), (e) => e.name === 'MarketplaceError' && !/row-level|products/.test(e.message));
  await assert.rejects(services.guarded(async () => { throw { code: '23505', message: 'duplicate key value violates unique constraint "products_sku_key"' }; }), (e) => e.message === 'Bu kayıt zaten mevcut.');
  await assert.rejects(services.guarded(async () => { throw Object.assign(new TypeError('Failed to fetch'), {}); }), (e) => /Bağlantı/.test(e.message));

  const calls = [];
  const repo = new Proxy({}, { get: (_t, name) => async (...args) => { calls.push([name, ...args]); return []; } });
  const svc = services.createServices({ returns: repo, questions: repo, account: repo });
  await assert.rejects(svc.returns.reject('r1', 'x'), (e) => e.code === 'REASON_REQUIRED');
  await assert.rejects(svc.returns.request({ orderItemId: 'a#0', quantity: 1.5, reason: 'defective' }), (e) => e.code === 'INVALID_QUANTITY');
  await assert.rejects(svc.returns.request({ orderItemId: 'a#0', quantity: 1, reason: 'uydurma' }), (e) => e.code === 'INVALID_REASON');
  await assert.rejects(svc.returns.shipBack('r1', '', ''), (e) => e.code === 'SHIPMENT_REQUIRED');
  await assert.rejects(svc.questions.ask('demo-x', 'abc'), (e) => e.code === 'INVALID_QUESTION');
  await assert.rejects(svc.account.saveAddress(null, { ...goodAddress, isDefault: false, phone: 'abc' }), (e) => e.code === 'INVALID_ADDRESS');
  assert.equal(calls.length, 0, 'geçersiz istekler depoya hiç ulaşmamalı');
  assert.equal(svc.finance, null); // demo modunda gerçek finans defteri yoktur
  await svc.returns.reject('r1', 'Ürün kullanılmış görünüyor');
  same(calls[0], ['transition', 'r1', 'rejected', { note: 'Ürün kullanılmış görünüyor' }]);
});

test('Servisler: adres sınırı aşılınca yeni adres reddedilir', async () => {
  const full = Array.from({ length: 10 }, (_, i) => ({ id: `a${i}` }));
  const repo = { listAddresses: async () => full, saveAddress: async () => { throw new Error('çağrılmamalı'); } };
  const svc = services.createAccountService(repo);
  await assert.rejects(svc.saveAddress(null, { ...goodAddress, isDefault: false }), (e) => e.code === 'ADDRESS_LIMIT');
});

// ─── Demo modu genişletmeleri ───────────────────────────────────────────────
test('Demo: teslim anı kaydedilir (iade süresi buradan başlar) ve iade edilen ürün stoğa geri eklenebilir', () => {
  const shop = { ownerId: 'seller', reference: 'VP-1', status: 'onaylandi', products: [{ id: 'p1', name: 'Ürün', sku: 'S', category: 'Ev', price: 100, cost: 40, stock: 5 }], campaigns: [], settings: { storeName: 'Demo Mağaza', description: '', contactEmail: 'a@b.co', contactPhone: '' }, shipping: { shippingFee: 0, freeShippingThreshold: 0, preparationDays: 1, carrier: 'K' } };
  const state = { ...demo.emptyDemo, users: [{ id: 'buyer', name: 'Ali', email: 'a@b.co' }], currentUserId: 'buyer', shops: [shop] };
  const placed = demo.placeDemoOrder(state, [{ slug: 'demo-p1', quantity: 2 }], () => null, { address: 'x', billingAddress: 'x', coupon: null, express: false }, 'VP-DEMO');
  assert.equal(placed.order.deliveredAt, undefined);
  let current = placed.state;
  for (const status of ['hazirlaniyor', 'kargoda', 'teslim-edildi']) current = demo.transitionOrder(current, 'VP-DEMO', status, true);
  assert.equal(typeof current.orders[0].deliveredAt, 'string');
  assert.equal(current.shops[0].products[0].stock, 3);
  assert.equal(demo.restockProduct(current, 'demo-p1', 2).shops[0].products[0].stock, 5);
  assert.equal(demo.restockProduct(current, 'demo-p1', 0), current);
  assert.equal(demo.restockProduct(current, 'demo-yok', 2).shops[0].products[0].stock, 3);
});

// ─── Aşama 2 · eşitleme kuyruğu ─────────────────────────────────────────────
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

test('SyncQueue: işler sırayla çalışır, kuyruk boşalınca idle olur ve onIdle bir kez çağrılır', async () => {
  const log = []; const snapshots = []; let idle = 0;
  const queue = new syncQueue.SyncQueue(snapshot => snapshots.push(snapshot.status), () => { idle += 1; });
  queue.enqueue('a', async () => { await tick(); log.push('a'); });
  queue.enqueue('b', async () => { log.push('b'); });
  assert.equal(queue.snapshot().status, 'syncing');
  assert.equal(await queue.whenIdle(1000), true);
  same(log, ['a', 'b']);
  assert.equal(queue.snapshot().status, 'idle');
  assert.equal(idle, 1);
  assert.equal(snapshots.includes('syncing'), true);
});

test('SyncQueue: bir iş başarısız olursa kuyruk durur (sonrakiler çalışmaz), retry ile kaldığı yerden devam eder', async () => {
  const log = []; let fail = true;
  const queue = new syncQueue.SyncQueue(() => {});
  queue.enqueue('a', async () => { log.push('a'); });
  queue.enqueue('b', async () => { log.push('b'); if (fail) throw new Error('boom'); });
  queue.enqueue('c', async () => { log.push('c'); });
  assert.equal(await queue.whenIdle(1000), false);
  const failed = queue.snapshot();
  assert.equal(failed.status, 'error');
  assert.equal(failed.pending, 2); // b ve c hâlâ bekliyor; a tamamlandı
  same(log, ['a', 'b']);
  fail = false;
  queue.retry();
  assert.equal(await queue.whenIdle(1000), true);
  same(log, ['a', 'b', 'b', 'c']);
  assert.equal(queue.snapshot().status, 'idle');
});

test('SyncQueue: clear bekleyen işleri ve hatayı atar; çalışan işin sonucu yok sayılır', async () => {
  const log = [];
  const queue = new syncQueue.SyncQueue(() => {});
  queue.enqueue('a', async () => { await tick(); log.push('a'); });
  queue.enqueue('b', async () => { log.push('b'); });
  assert.equal(queue.clear(), 2);
  await tick(); await tick();
  same(log, ['a']); // b hiç çalışmadı
  assert.equal(queue.snapshot().status, 'idle');
  queue.enqueue('c', async () => { log.push('c'); });
  assert.equal(await queue.whenIdle(1000), true);
  same(log, ['a', 'c']);
});

test('SyncQueue: whenIdle süre dolarsa false döner', async () => {
  const queue = new syncQueue.SyncQueue(() => {});
  queue.enqueue('yavaş', () => new Promise(resolve => setTimeout(resolve, 80)));
  assert.equal(await queue.whenIdle(5), false);
  assert.equal(await queue.whenIdle(1000), true);
});

// ─── Aşama 2 · sunucu / yerel sipariş meta birleştirme ──────────────────────
test('Sipariş meta birleştirme: sunucu kazanır, tanımsız alan yereli ezmez, olaylar birleşir', () => {
  const local = { carrier: 'Yerel', labelCreated: true, notes: 'yerel not', events: [{ key: 'etiket', at: '2026-01-02T10:00:00Z' }, { key: 'alindi', at: '2026-01-01T09:00:00Z' }] };
  const server = { carrier: 'Sunucu Kargo', tracking: 'TRK1', notes: undefined, events: [{ key: 'alindi', at: '2026-01-01T09:05:00Z' }, { key: 'kargoda', at: '2026-01-03T08:00:00Z' }] };
  const merged = opsMerge.mergeOrderMeta(local, server);
  assert.equal(merged.carrier, 'Sunucu Kargo');
  assert.equal(merged.tracking, 'TRK1');
  assert.equal(merged.notes, 'yerel not');
  assert.equal(merged.labelCreated, true);
  same(merged.events.map(e => e.key), ['alindi', 'etiket', 'kargoda']);
  assert.equal(merged.events.find(e => e.key === 'alindi').at, '2026-01-01T09:05:00Z'); // sunucu zamanı geçerli
  same(opsMerge.mergeOrderMeta(local, undefined), local);
});

test('Sipariş meta birleştirme: paket gerçek hesaptan gelir, yerel ops değişmez', () => {
  const localOps = { planKey: 'starter', billing: 'monthly', orderMeta: { A: { notes: 'x' } }, stockMovements: [], readNotifications: [], sampleLoaded: false, capacityRequest: null };
  const merged = opsMerge.mergeServerOps(localOps, { A: { tracking: 'T' }, B: { carrier: 'K' } }, 'pro');
  assert.equal(merged.planKey, 'pro');
  assert.equal(merged.orderMeta.A.notes, 'x');
  assert.equal(merged.orderMeta.A.tracking, 'T');
  assert.equal(merged.orderMeta.B.carrier, 'K');
  assert.equal(localOps.orderMeta.B, undefined);
  assert.equal(opsMerge.mergeServerOps(localOps, {}).planKey, 'starter');
});

// ─── Aşama 2 · kimlik bilgisi doğrulaması ───────────────────────────────────
test('Kimlik doğrulama: e-posta, şifre ve ad kuralları', () => {
  assert.equal(credentials.validateEmail('ali@ornek.com'), null);
  for (const bad of ['', 'ali', 'ali@', 'ali@ornek', 'a li@ornek.com']) assert.notEqual(credentials.validateEmail(bad), null, bad);
  assert.equal(credentials.validatePassword('abc12345'), null);
  assert.notEqual(credentials.validatePassword('kisa1'), null);
  assert.notEqual(credentials.validatePassword('sadeceharfler'), null);
  assert.notEqual(credentials.validatePassword('12345678'), null);
  assert.notEqual(credentials.validatePassword('a1'.repeat(40)), null); // 80 bayt > 72
  assert.equal(credentials.validateFullName('Al'), null);
  assert.notEqual(credentials.validateFullName('A'), null);
  assert.notEqual(credentials.validateSignIn({ email: 'ali@ornek.com', password: '' }), null);
  assert.equal(credentials.validateSignUp({ name: 'Ali Veli', email: 'ali@ornek.com', password: 'abc12345' }), null);
});

test('Kimlik doğrulama: hata mesajları hesap varlığını sızdırmaz ve ham hatayı göstermez', () => {
  const wrongPassword = credentials.friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' });
  const unknownUser = credentials.friendlyAuthError({ message: 'Invalid login credentials' });
  assert.equal(wrongPassword, unknownUser);
  assert.equal(credentials.friendlyAuthError({ code: 'email_not_confirmed' }).includes('doğrulanmadı'), true);
  assert.equal(credentials.friendlyAuthError({ status: 429 }).includes('Çok fazla'), true);
  assert.equal(credentials.friendlyAuthError({ message: 'Failed to fetch' }).includes('Bağlantı'), true);
  const raw = credentials.friendlyAuthError({ message: 'duplicate key value violates unique constraint "users_email_key"' });
  assert.equal(raw, credentials.AUTH_GENERIC_ERROR);
  assert.equal(credentials.friendlyAuthError(null), credentials.AUTH_GENERIC_ERROR);
});

// ─── Aşama 2 · gerçek mod sepet özeti ───────────────────────────────────────
const liveProduct = (slug, seller, price, extra = {}) => ({ id: slug, slug, name: slug, seller, price, stock: 10, storeInfo: { shippingFee: 49.9, freeShippingThreshold: 250 }, ...extra });
const cartLine = (slug, quantity, variantLabel) => ({ lineId: slug, slug, quantity, ...(variantLabel ? { variantLabel } : {}) });

test('Sepet özeti: sipariş mağaza başına oluşur; kargo ve ücretsiz kargo eşiği her mağazada ayrı hesaplanır', () => {
  const entries = [
    { line: cartLine('a1', 1), product: liveProduct('a1', 'Mağaza A', 100) },
    { line: cartLine('a2', 1), product: liveProduct('a2', 'Mağaza A', 100) },
    { line: cartLine('b1', 1), product: liveProduct('b1', 'Mağaza B', 300, { storeInfo: { shippingFee: 20, freeShippingThreshold: 250 } }) },
  ];
  const quote = cartQuote.quoteCart(entries);
  assert.equal(quote.groups.length, 2);
  const a = quote.groups.find(g => g.seller === 'Mağaza A').quote;
  const b = quote.groups.find(g => g.seller === 'Mağaza B').quote;
  same(a, { subtotal: 200, discount: 0, shipping: 49.9, total: 249.9 }); // tek başına 250 altı → kargo ücretli
  same(b, { subtotal: 300, discount: 0, shipping: 0, total: 300 });      // eşik aşıldı → ücretsiz
  assert.equal(quote.total, 549.9);
  assert.equal(quote.shipping, 49.9);
});

test('Sepet özeti: kupon her mağaza siparişine %10 uygulanır; hızlı kargo her mağaza siparişine eklenir', () => {
  const entries = [
    { line: cartLine('a1', 2), product: liveProduct('a1', 'Mağaza A', 100) },
    { line: cartLine('b1', 1), product: liveProduct('b1', 'Mağaza B', 100) },
  ];
  const quote = cartQuote.quoteCart(entries, { coupon: 'vitrinplus10', express: true });
  assert.equal(quote.discount, 30); // 20 + 10
  assert.equal(quote.shipping, round(49.9 * 2 + 29.9 * 2));
  assert.equal(quote.subtotal, 300);
  assert.equal(quote.total, round(300 - 30 + quote.shipping));
  assert.equal(cartQuote.quoteCart(entries, { coupon: 'YANLIS' }).discount, 0);
});
function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

test('Sepet özeti: örnek katalog ürünleri (mağaza kaydı yok) sipariş edilemez olarak ayrılır; tek varsayılan mağazada demo toplamıyla aynıdır', () => {
  const sample = { line: cartLine('mock', 1), product: { id: 'mock', slug: 'mock', name: 'Örnek', seller: 'Örnek Mağaza', price: 500, stock: 3 } };
  const real = { line: cartLine('r1', 1), product: liveProduct('r1', 'Mağaza A', 300) };
  const quote = cartQuote.quoteCart([sample, real]);
  assert.equal(quote.notOrderable.length, 1);
  assert.equal(quote.groups.length, 1);
  const demoTotals = demo.totals(300, null);
  assert.equal(quote.total, demoTotals.total);
  assert.equal(quote.shipping, demoTotals.shipping);
});

test('Sepet satırı stok kontrolü: seçenek bazlı stok ürün stoğundan önceliklidir', () => {
  const product = liveProduct('p', 'M', 10, { stock: 20, variantOptions: [{ label: 'M', stock: 2 }, { label: 'L', stock: 0 }] });
  assert.equal(cartQuote.lineStockProblem(cartLine('p', 2, 'M'), product), null);
  assert.equal(cartQuote.lineStockProblem(cartLine('p', 3, 'M'), product), 'Yalnızca 2 adet kaldı');
  assert.equal(cartQuote.lineStockProblem(cartLine('p', 1, 'L'), product), 'Stokta yok');
  assert.equal(cartQuote.lineStockProblem(cartLine('p', 20), product), null); // seçeneksiz satır ürün stoğuna bakar
  assert.equal(cartQuote.lineAvailable(cartLine('p', 1, 'M'), product), 2);
});

// ─── Aşama 2 · ürün formu (barkod, seçenek stoğu) ───────────────────────────
test('Ürün formu: seçenek stokları girilirse ürün stoğu toplamdır; barkod kayda geçer; demo formu değişmez', () => {
  const form = { ...productForm.emptyProductForm, name: 'Tişört', category: 'Giyim', price: '100', sku: 'TS-1', stock: '99', barcode: ' 8690000000001 ',
    variants: [{ id: 'v1', label: 'S', sku: '', stock: '3' }, { id: 'v2', label: 'M', sku: 'TS-1-M', stock: '4' }] };
  const saved = productForm.formToProduct(form, 'aktif');
  assert.equal(saved.stock, 7);
  assert.equal(saved.barcode, '8690000000001');
  same(saved.variants.map(v => v.stock), [3, 4]);
  const demoForm = { ...form, variants: form.variants.map(v => ({ ...v, stock: '' })) };
  const demoSaved = productForm.formToProduct(demoForm, 'aktif');
  assert.equal(demoSaved.stock, 99);
  assert.equal('stock' in demoSaved.variants[0], false);
});

test('Ürün formu doğrulaması: barkod 64 karakteri, seçenek stoğu tam sayı kuralını aşamaz', () => {
  const base = { ...productForm.emptyProductForm, name: 'Tişört' };
  assert.equal(productForm.validateProductForm({ ...base, barcode: 'x'.repeat(65) }, 'draft', []).barcode !== undefined, true);
  assert.equal(productForm.validateProductForm({ ...base, barcode: 'x'.repeat(64) }, 'draft', []).barcode, undefined);
  const bad = { ...base, variants: [{ id: 'v', label: 'S', sku: '', stock: '1.5' }] };
  assert.equal(productForm.validateProductForm(bad, 'draft', []).variants !== undefined, true);
  const negative = { ...base, variants: [{ id: 'v', label: 'S', sku: '', stock: '-1' }] };
  assert.equal(productForm.validateProductForm(negative, 'draft', []).variants !== undefined, true);
});

test('Ürün formu: seçenek stoklu ürün yayınlanabilir; boş / yinelenen / eksik varyant stoğu reddedilir', () => {
  const ready = { ...productForm.emptyProductForm, name: 'Tişört', category: 'Giyim', price: '100', sku: 'TS-1' };
  const withVariants = (variants) => ({ ...ready, variants });
  const v = (id, label, stock) => ({ id, label, sku: '', stock });
  // Ürün stoğu ayrıca girilmeden, seçenek stokları toplamıyla yayınlanabilir.
  assert.deepEqual(Object.keys(productForm.validateProductForm(withVariants([v('a', 'S', '3'), v('b', 'M', '0')]), 'publish', [])), []);
  // Seçenek stoğu yoksa ürün stoğu yine zorunlu.
  assert.equal(productForm.validateProductForm(withVariants([v('a', 'S', '')]), 'publish', []).stock !== undefined, true);
  // Bir varyantta stok girilip diğerinde boş bırakılamaz; adı boş satırlar yok sayılır.
  assert.equal(productForm.validateProductForm(withVariants([v('a', 'S', '3'), v('b', 'M', '')]), 'publish', []).variants !== undefined, true);
  assert.deepEqual(Object.keys(productForm.validateProductForm(withVariants([v('a', 'S', '3'), v('b', '  ', '')]), 'publish', [])), []);
  // Aynı ad (büyük/küçük harf ve boşluk farkı yok sayılır) iki kez kullanılamaz.
  assert.equal(productForm.validateProductForm(withVariants([v('a', 'Siyah', '1'), v('b', ' siyah ', '2')]), 'draft', []).variants !== undefined, true);
  // Kayıt: adı boş satır düşer, toplam yalnızca adlı varyantlardan gelir.
  const saved = productForm.formToProduct(withVariants([v('a', 'S', '3'), v('b', '', '9')]), 'aktif');
  assert.equal(saved.stock, 3);
  assert.equal(saved.variants.length, 1);
});

// ─── Aşama 2 · gerçek mod finans özeti ve stok hareketi ─────────────────────
test('Gerçek mod ödeme özeti: kazanç defterinden türetilir; sonraki ödeme en yakın planlanan kayıttır', () => {
  const finance = { summary: { paidTotal: 100, pendingBalance: 40.1, availableBalance: 20, plannedBalance: 30 }, payouts: [
    { id: '1', status: 'paid', plannedFor: '2026-01-01', amount: 100 },
    { id: '2', status: 'planned', plannedFor: '2026-03-10', amount: 50 },
    { id: '3', status: 'processing', plannedFor: '2026-02-01', amount: 30 },
    { id: '4', status: 'cancelled', plannedFor: '2026-01-15', amount: 5 },
  ] };
  const result = liveFinance.summarizeLivePayouts(finance);
  assert.equal(result.paidOut, 100);
  assert.equal(result.pending, 90.1);
  assert.equal(result.nextPayoutAmount, 30);
  assert.equal(new Date(result.nextPayoutAt).toISOString().slice(0, 10), '2026-02-01');
  const none = liveFinance.summarizeLivePayouts({ summary: { paidTotal: 0, pendingBalance: 0, availableBalance: 0, plannedBalance: 0 }, payouts: [] });
  assert.equal(none.nextPayoutAt, null);
  assert.equal(none.nextPayoutAmount, 0);
});

test('Stok hareketi arayüz dönüşümü: tür etiketi + not; silinmiş ürünün hareketi atlanır', () => {
  const view = { id: 'm1', productId: 'p1', variantId: null, productName: 'X', type: 'sale', change: -2, before: 5, after: 3, referenceType: 'order', note: 'VP-1', createdAt: '2026-01-01T00:00:00Z' };
  same(movementUi.toUiMovement(view), { id: 'm1', productId: 'p1', delta: -2, reason: 'Satış · VP-1', at: '2026-01-01T00:00:00Z' });
  assert.equal(movementUi.toUiMovement({ ...view, productId: null }), null);
  assert.equal(movementUi.toUiMovement({ ...view, type: 'return_restock', note: null, change: 1 }).reason, 'İade / stoğa geri ekleme');
  for (const type of ['initial', 'manual_add', 'manual_remove', 'manual_set', 'sale', 'order_cancel', 'return_restock', 'adjustment']) assert.equal(typeof movementUi.movementTypeLabels[type], 'string', type);
});
