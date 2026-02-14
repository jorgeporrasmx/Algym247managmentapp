export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  brand?: string
  category?: string
  max_stock: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

export interface CartContextType {
  cart: Cart
  addToCart: (product: { product_id: string; name: string; price: number; stock?: number | string; brand?: string; category?: string }, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}