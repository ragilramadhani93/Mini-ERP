import test from 'node:test'
import assert from 'node:assert/strict'

// 1. Sale item and total calculation
function calculateSaleTotal(items, platformFeePercent = 0) {
  const subtotal = items.reduce((acc, item) => {
    const itemTotal = (item.unit_price * item.quantity) - (item.discount || 0)
    return acc + Math.max(0, itemTotal)
  }, 0)
  const feeAmount = Math.round(subtotal * (platformFeePercent / 100))
  const netReceived = subtotal - feeAmount
  return { subtotal, feeAmount, netReceived }
}

// 2. Deposit and overpayment calculation
function calculatePaymentSettlement(totalAmount, amountPaid, existingDeposit = 0) {
  let depositUsed = 0
  let needed = totalAmount

  if (existingDeposit > 0) {
    depositUsed = Math.min(existingDeposit, needed)
    needed -= depositUsed
  }

  const change = amountPaid - needed
  const isOverpaid = change > 0
  const overpaidAmount = isOverpaid ? change : 0
  const isPaid = change >= 0

  return { depositUsed, neededAfterDeposit: needed, isPaid, isOverpaid, overpaidAmount }
}

// 3. Sales return calculation
function calculateReturnRefund(returnItems, shippingCost = 0) {
  const productRefund = returnItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)
  const totalRefund = Math.max(0, productRefund - shippingCost)
  return { productRefund, shippingCost, totalRefund }
}

// 4. Stock balance delta calculation
function calculateStockDelta(currentStock, quantityChange, type) {
  if (type === 'out') {
    if (currentStock < quantityChange) {
      throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${quantityChange}`)
    }
    return currentStock - quantityChange
  }
  return currentStock + quantityChange
}

test('calculateSaleTotal computes subtotal, platform fees, and net received correctly', () => {
  const items = [
    { unit_price: 100000, quantity: 2, discount: 10000 }, // 190,000
    { unit_price: 50000, quantity: 1, discount: 0 }        // 50,000
  ]
  const result = calculateSaleTotal(items, 5) // 5% fee
  assert.equal(result.subtotal, 240000)
  assert.equal(result.feeAmount, 12000)
  assert.equal(result.netReceived, 228000)
})

test('calculatePaymentSettlement handles deposit deduction and overpayment to credit', () => {
  // Total 100k, Customer has 30k deposit, pays 80k in cash
  const result = calculatePaymentSettlement(100000, 80000, 30000)
  assert.equal(result.depositUsed, 30000)
  assert.equal(result.neededAfterDeposit, 70000)
  assert.equal(result.isPaid, true)
  assert.equal(result.isOverpaid, true)
  assert.equal(result.overpaidAmount, 10000)
})

test('calculateReturnRefund deducts return shipping accurately', () => {
  const returnItems = [
    { unit_price: 150000, quantity: 2 } // 300,000
  ]
  const result = calculateReturnRefund(returnItems, 25000)
  assert.equal(result.productRefund, 300000)
  assert.equal(result.totalRefund, 275000)
})

test('calculateStockDelta applies deductions and guards negative inventory', () => {
  assert.equal(calculateStockDelta(50, 15, 'out'), 35)
  assert.equal(calculateStockDelta(50, 20, 'in'), 70)
  assert.throws(() => calculateStockDelta(10, 15, 'out'), /Insufficient stock/)
})
