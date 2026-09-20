import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const compiled = ts.transpileModule(fs.readFileSync('lib/demo-marketplace.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, Date, Map, Error });
const { emptyDemo, placeDemoOrder, transitionOrder, totals } = exportsObject;
const product = { slug: 'catalog-one', name: 'Örnek ürün', price: 100, stock: 5, seller: 'Örnek satıcı' };
const catalog = slug => slug === product.slug ? product : undefined;
const line = { lineId: product.slug, slug: product.slug, quantity: 2 };
const details = { address: 'Demo adres', billingAddress: 'Demo fatura', coupon: null, express: false };
function state() { return { ...structuredClone(emptyDemo), currentUserId: 'buyer', users: [{ id: 'buyer', name: 'Alıcı', email: 'buyer@example.com' }] }; }
function order(initial = state()) { return placeDemoOrder(initial, [line], catalog, details, 'VP-TEST'); }
test('Sipariş anlık fiyatı kaydeder, katalog stoğunu düşürür ve önceki durumu değiştirmez', () => {
  const before = state(); const result = order(before);
  assert.equal(result.order.total, 249.9); assert.equal(result.order.items[0].price, 100);
  assert.equal(result.state.sold[product.slug], 2); assert.equal(before.orders.length, 0);
});
test('Aynı ürünün farklı varyantları birlikte stok kontrolüne girer', () => {
  assert.throws(() => placeDemoOrder(state(), [{ ...line, quantity: 3 }, { ...line, lineId: 'variant', quantity: 3 }], catalog, details, 'VP-X'), /stokta/);
});
test('Negatif, kesirli ve boş siparişler reddedilir', () => {
  for (const quantity of [-1, 0, 1.5, NaN]) assert.throws(() => placeDemoOrder(state(), [{ ...line, quantity }], catalog, details, 'VP-X'));
  assert.throws(() => placeDemoOrder(state(), [], catalog, details, 'VP-X'), /boş/);
});
test('Giriş yapmadan sipariş oluşmaz', () => assert.throws(() => order({ ...state(), currentUserId: null }), /giriş/));
test('Aynı sipariş kimliği tekrar işlenmez', () => assert.throws(() => order(order().state), /zaten/));
test('Stok yetersizken ikinci sipariş oluşmaz', () => assert.throws(() => placeDemoOrder(order().state, [{ ...line, quantity: 4 }], catalog, details, 'VP-2'), /stokta/));
test('İptal stoğu bir kez geri verir', () => {
  const cancelled = transitionOrder(order().state, 'VP-TEST', 'iptal-edildi');
  assert.equal(cancelled.sold[product.slug], 0);
  assert.throws(() => transitionOrder(cancelled, 'VP-TEST', 'iptal-edildi'), /durum/);
});
test('Başka alıcı iptal edemez, alıcı kargoya veremez', () => {
  assert.throws(() => transitionOrder({ ...order().state, currentUserId: 'other' }, 'VP-TEST', 'iptal-edildi'), /yetkin/);
  assert.throws(() => transitionOrder(order().state, 'VP-TEST', 'kargoda'), /durum/);
});
test('Hazırlama, kargo, teslim sıralı ilerler; teslim edilmiş sipariş iptal edilmez', () => {
  let current = order().state;
  for (const status of ['hazirlaniyor', 'kargoda', 'teslim-edildi']) current = transitionOrder(current, 'VP-TEST', status, true);
  assert.equal(current.orders[0].status, 'teslim-edildi');
  assert.throws(() => transitionOrder(current, 'VP-TEST', 'iptal-edildi', true));
});
test('Kupon sonrası kargo eşiği ve hızlı kargo aynı hesaplanır', () => {
  assert.equal(totals(250, 'VITRINPLUS10').total, 274.9);
  assert.equal(totals(300, 'VITRINPLUS10', true).total, 299.9);
  assert.equal(totals(0, null).total, 0);
});
test('Satıcı ürünü stoku düşer, iptalde geri gelir; silinen ürün satılamaz', () => {
  const initial = state();
  initial.shops = [{ ownerId: 'seller', reference: 'S', status: 'onaylandi', products: [{ id: 'p', name: 'Demo', sku: 'D1', category: 'Genel', price: 300, cost: 100, stock: 2 }], settings: { storeName: 'Demo Mağaza', description: '' } }];
  const result = placeDemoOrder(initial, [{ lineId: 'demo-p', slug: 'demo-p', quantity: 1 }], catalog, details, 'VP-S');
  assert.equal(result.state.shops[0].products[0].stock, 1);
  assert.equal(transitionOrder(result.state, 'VP-S', 'iptal-edildi').shops[0].products[0].stock, 2);
  initial.shops[0].products = [];
  assert.throws(() => placeDemoOrder(initial, [{ lineId: 'demo-p', slug: 'demo-p', quantity: 1 }], catalog, details, 'VP-S'), /satışta değil/);
});
test('Onaylanmamış mağazanın ürünü satılamaz', () => {
  const initial = state(); initial.shops = [{ ownerId: 'seller', status: 'bekliyor', products: [{ id: 'p' }] }];
  assert.throws(() => placeDemoOrder(initial, [{ lineId: 'demo-p', slug: 'demo-p', quantity: 1 }], catalog, details, 'VP-S'));
});
